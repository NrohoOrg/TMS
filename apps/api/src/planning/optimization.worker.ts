import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import axios from 'axios';
import { JobStatus, PlanStatus, Prisma, StopType, TaskStatus } from '@prisma/client';
import type { LatLng, RoutingMatrixProvider } from '@contracts/index';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ROUTING_MATRIX_PROVIDER } from '../routing/routing.constants';
import { OptimizationQueuePayload } from './optimization.queue';

type OptimizerRequest = {
  jobId: string;
  config: {
    maxSolveSeconds: number;
    speedKmh: number;
    returnToDepot: boolean;
    dropoffWithinSeconds: number;
    dropoffServiceSeconds: number;
    colocatedMarginalServiceSeconds: number;
    loadBalancingDzdPerTask: number;
    fuelCostMicroDzdPerMeter: number;
    timeCostMicroDzdPerSecond: number;
    unassignedPenaltyNormalDzd: number;
    unassignedPenaltyUrgentDzd: number;
  };
  /** Pre-computed road-distance matrix in metres, indexed in the order
   *  Python builds the node list: [start depots..., end depots..., then
   *  per-task pickup, dropoff]. Worker computes this via the routing
   *  provider so the optimizer doesn't need a routing engine. */
  distanceMatrixM: number[][];
  /** Pre-computed travel-duration matrix in seconds, same indexing. */
  timeMatrixS: number[][];
  drivers: Array<{
    id: string;
    shiftStartS: number;
    shiftEndS: number;
    depotLat: number;
    depotLng: number;
    capacityUnits: number | null;
  }>;
  tasks: Array<{
    id: string;
    priority: string;
    pickupLat: number;
    pickupLng: number;
    pickupWindowStartS: number;
    pickupWindowEndS: number;
    pickupServiceS: number;
    dropoffLat: number;
    dropoffLng: number;
    capacityUnits: number;
  }>;
};

type OptimizerResponse = {
  jobId: string;
  status: 'completed' | 'failed';
  routes: Array<{
    driverId: string;
    stops: Array<{
      taskId: string;
      type: 'pickup' | 'dropoff';
      sequence: number;
      arrivalS: number;
      departureS: number;
    }>;
    totalDistanceM: number;
    totalTimeS: number;
  }>;
  unassigned: Array<{
    taskId: string;
    reason: string;
  }>;
  error?: string;
};

@Injectable()
export class OptimizationWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<OptimizationQueuePayload>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @Inject(ROUTING_MATRIX_PROVIDER)
    private readonly routingMatrix: RoutingMatrixProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.shouldEnableWorker()) {
      return;
    }

    await this.recoverStaleRunningJobs();

    this.worker = new Worker<OptimizationQueuePayload>(
      'optimization',
      async (job) => {
        await this.process(job);
      },
      {
        concurrency: 1,
        connection: this.redisService.getClient() as any,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async recoverStaleRunningJobs(): Promise<void> {
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    await this.prisma.optimizationJob.updateMany({
      where: {
        status: JobStatus.running,
        startedAt: { lt: staleBefore },
      },
      data: {
        status: JobStatus.failed,
        error: 'Worker crashed',
        finishedAt: new Date(),
      },
    });
  }

  private shouldEnableWorker(): boolean {
    if (!process.env.DATABASE_URL) {
      return false;
    }

    if (
      process.env.NODE_ENV === 'test' &&
      process.env.ENABLE_OPTIMIZATION_WORKER_IN_TESTS !== 'true'
    ) {
      return false;
    }

    return true;
  }

  private async process(job: Job<OptimizationQueuePayload>): Promise<void> {
    const optimizationJob = await this.prisma.optimizationJob.findUnique({
      where: { id: job.data.jobId },
      select: { id: true, createdById: true },
    });
    if (!optimizationJob) {
      return;
    }

    await this.prisma.optimizationJob.update({
      where: { id: optimizationJob.id },
      data: {
        status: JobStatus.running,
        startedAt: new Date(),
        progressPercent: 10,
        error: null,
        finishedAt: null,
      },
    });

    try {
      const targetDate = this.parseDate(job.data.date);
      const { start, end } = this.getDayRange(targetDate);

      const [config, activeDrivers, tasks] = await Promise.all([
        this.prisma.config.findUnique({
          where: { id: 1 },
          select: {
            maxSolveSeconds: true,
            speedKmh: true,
            dropoffWithinHours: true,
            dropoffServiceMinutesDefault: true,
            colocatedMarginalServiceSeconds: true,
            loadBalancingKmPerTask: true,
            fuelLPer100Km: true,
            dieselPricePerLiterDZD: true,
            timeCostDzdPerHour: true,
            unassignedPenaltyNormalDzd: true,
            unassignedPenaltyUrgentDzd: true,
          },
        }),
        this.prisma.driver.findMany({
          where: { active: true },
          select: {
            id: true,
            shiftStart: true,
            shiftEnd: true,
            depotLat: true,
            depotLng: true,
            capacityUnits: true,
          },
        }),
        this.prisma.task.findMany({
          where: {
            status: TaskStatus.pending,
            approvalStatus: 'approved',
            pickupWindowStart: {
              gte: start,
              lt: end,
            },
          },
          select: {
            id: true,
            priority: true,
            pickupLat: true,
            pickupLng: true,
            pickupWindowStart: true,
            pickupWindowEnd: true,
            pickupServiceMinutes: true,
            dropoffLat: true,
            dropoffLng: true,
          },
        }),
      ]);

      if (!config) {
        throw new Error('Config not found');
      }

      if (tasks.length === 0) {
        throw new Error('No pending tasks for date');
      }

      if (activeDrivers.length === 0) {
        throw new Error('No active drivers available for date');
      }

      const availabilityRows = await this.prisma.availability.findMany({
        where: {
          date: targetDate,
          driverId: { in: activeDrivers.map((driver) => driver.id) },
        },
        select: {
          driverId: true,
          available: true,
          shiftStartOverride: true,
          shiftEndOverride: true,
        },
      });
      const availabilityByDriverId = new Map(
        availabilityRows.map((row) => [row.driverId, row]),
      );

      const optimizerDrivers = activeDrivers.flatMap((driver) => {
        const availability = availabilityByDriverId.get(driver.id);
        const available = availability?.available ?? true;
        if (!available) {
          return [];
        }

        const shiftStart = availability?.shiftStartOverride ?? driver.shiftStart;
        const shiftEnd = availability?.shiftEndOverride ?? driver.shiftEnd;

        return [
          {
            id: driver.id,
            shiftStartS: this.timeToSeconds(shiftStart),
            shiftEndS: this.timeToSeconds(shiftEnd),
            depotLat: driver.depotLat,
            depotLng: driver.depotLng,
            capacityUnits: driver.capacityUnits,
          },
        ];
      });

      if (optimizerDrivers.length === 0) {
        throw new Error('No available drivers for date');
      }

      const dropoffServiceSeconds = config.dropoffServiceMinutesDefault * 60;
      const taskServiceById = new Map(
        tasks.map((task) => [
          task.id,
          {
            pickupServiceS: task.pickupServiceMinutes * 60,
            dropoffServiceS: dropoffServiceSeconds,
          },
        ]),
      );

      // OR objective coefficients in micro-DZD. Round-trip-safe integer
      // conversion: fuel_dzd_per_m × 1e6 = (price × L_per_100km) × 10.
      const fuelCostMicroDzdPerMeter = Math.round(
        config.dieselPricePerLiterDZD * config.fuelLPer100Km * 10,
      );
      const timeCostMicroDzdPerSecond = Math.round(
        (config.timeCostDzdPerHour / 3600) * 1_000_000,
      );
      // Preserve the existing loadBalancingKmPerTask semantic ("X km of
      // detour acceptable per task of imbalance") under the new DZD-based
      // optimizer. 1 km of fuel = price × L_per_100km / 100 DZD.
      const fuelDzdPerKm =
        (config.dieselPricePerLiterDZD * config.fuelLPer100Km) / 100;
      const loadBalancingDzdPerTask = Math.round(
        config.loadBalancingKmPerTask * fuelDzdPerKm,
      );

      // Build the node list in the exact order the Python solver expects:
      // [depot_start_0..D-1, depot_end_0..D-1, then for each task:
      // pickup, dropoff]. The routing matrix is computed against this
      // ordering so Python can index it directly.
      const matrixPoints: LatLng[] = [
        ...optimizerDrivers.map((d) => ({ lat: d.depotLat, lng: d.depotLng })),
        ...optimizerDrivers.map((d) => ({ lat: d.depotLat, lng: d.depotLng })),
        ...tasks.flatMap((task) => [
          { lat: task.pickupLat, lng: task.pickupLng },
          { lat: task.dropoffLat, lng: task.dropoffLng },
        ]),
      ];

      const { distances: distanceMatrixM, durations: timeMatrixS } =
        await this.routingMatrix.getMatrix(matrixPoints);

      const optimizerPayload: OptimizerRequest = {
        jobId: optimizationJob.id,
        config: {
          maxSolveSeconds: config.maxSolveSeconds,
          speedKmh: config.speedKmh,
          returnToDepot: job.data.returnToDepot,
          dropoffWithinSeconds: config.dropoffWithinHours * 3600,
          dropoffServiceSeconds,
          colocatedMarginalServiceSeconds: config.colocatedMarginalServiceSeconds,
          loadBalancingDzdPerTask,
          fuelCostMicroDzdPerMeter,
          timeCostMicroDzdPerSecond,
          unassignedPenaltyNormalDzd: config.unassignedPenaltyNormalDzd,
          unassignedPenaltyUrgentDzd: config.unassignedPenaltyUrgentDzd,
        },
        distanceMatrixM,
        timeMatrixS,
        drivers: optimizerDrivers,
        tasks: tasks.map((task) => ({
          id: task.id,
          priority: task.priority,
          pickupLat: task.pickupLat,
          pickupLng: task.pickupLng,
          pickupWindowStartS: this.dateToSecondsSinceMidnight(task.pickupWindowStart),
          pickupWindowEndS: this.dateToSecondsSinceMidnight(task.pickupWindowEnd),
          pickupServiceS: task.pickupServiceMinutes * 60,
          dropoffLat: task.dropoffLat,
          dropoffLng: task.dropoffLng,
          capacityUnits: 1,
        })),
      };

      const optimizerResponse = await this.callOptimizer(optimizerPayload, config.maxSolveSeconds);
      if (optimizerResponse.status !== 'completed') {
        throw new Error(optimizerResponse.error ?? 'Optimizer failed');
      }

      await this.prisma.optimizationJob.update({
        where: { id: optimizationJob.id },
        data: {
          progressPercent: 70,
        },
      });

      const finishedAt = new Date();
      const resultSnapshot = this.toJsonValue(optimizerResponse);
      await this.prisma.$transaction(async (tx) => {
        const plan = await tx.plan.create({
          data: {
            date: targetDate,
            status: PlanStatus.draft,
            createdById: optimizationJob.createdById,
          },
          select: { id: true },
        });

        const assignedTaskIds = new Set<string>();
        for (const route of optimizerResponse.routes) {
          const createdRoute = await tx.route.create({
            data: {
              planId: plan.id,
              driverId: route.driverId,
              totalDistanceM: Math.max(0, Math.round(route.totalDistanceM)),
              totalTimeS: Math.max(0, Math.round(route.totalTimeS)),
            },
            select: { id: true },
          });

          for (const stop of route.stops) {
            assignedTaskIds.add(stop.taskId);
            const etaS = Math.max(0, Math.round(stop.arrivalS));
            const optimizerDepartureS = Math.max(0, Math.round(stop.departureS));
            const serviceSeconds = this.resolveStopServiceSeconds(stop.type, taskServiceById.get(stop.taskId));
            await tx.stop.create({
              data: {
                routeId: createdRoute.id,
                taskId: stop.taskId,
                sequence: stop.sequence,
                type: stop.type === 'dropoff' ? StopType.dropoff : StopType.pickup,
                etaS,
                departureS: Math.max(optimizerDepartureS, etaS + serviceSeconds),
              },
            });
          }
        }

        if (assignedTaskIds.size > 0) {
          await tx.task.updateMany({
            where: {
              id: { in: [...assignedTaskIds] },
            },
            data: {
              status: TaskStatus.assigned,
            },
          });
        }

        await tx.optimizationJob.update({
          where: { id: optimizationJob.id },
          data: {
            status: JobStatus.completed,
            progressPercent: 100,
            planId: plan.id,
            finishedAt,
            error: null,
            resultSnapshot,
          },
        });
      });
    } catch (error) {
      await this.prisma.optimizationJob.update({
        where: { id: optimizationJob.id },
        data: {
          status: JobStatus.failed,
          error: this.toErrorMessage(error),
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async callOptimizer(
    payload: OptimizerRequest,
    maxSolveSeconds: number,
  ): Promise<OptimizerResponse> {
    const optimizerUrl = (this.configService.get<string>('OPTIMIZER_URL') ?? 'http://optimizer:8000')
      .replace(/\/$/, '');
    const response = await axios.post<OptimizerResponse>(`${optimizerUrl}/optimize`, payload, {
      timeout: (maxSolveSeconds + 15) * 1000,
    });
    return response.data;
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('date must be YYYY-MM-DD');
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error('date must be a valid YYYY-MM-DD value');
    }

    return parsed;
  }

  private getDayRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private timeToSeconds(time: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
    if (!match) {
      throw new Error(`Invalid shift time: ${time}`);
    }

    return Number(match[1]) * 3600 + Number(match[2]) * 60;
  }

  private dateToSecondsSinceMidnight(value: Date): number {
    return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
  }

  private resolveStopServiceSeconds(
    stopType: 'pickup' | 'dropoff',
    taskService:
      | {
          pickupServiceS: number;
          dropoffServiceS: number;
        }
      | undefined,
  ): number {
    if (!taskService) {
      return 0;
    }

    return stopType === 'pickup' ? taskService.pickupServiceS : taskService.dropoffServiceS;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown optimization error';
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
