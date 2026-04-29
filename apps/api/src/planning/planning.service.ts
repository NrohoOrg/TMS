import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus, PlanStatus, Prisma, StopStatus, StopType, TaskStatus } from '@prisma/client';
import { JobsOptions, Queue } from 'bullmq';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { OptimizeDto } from './dto/optimize.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { UpdateStopStatusDto } from './dto/update-stop-status.dto';
import { OPTIMIZATION_QUEUE, OptimizationQueuePayload } from './optimization.queue';

type QueueJobOptions = JobsOptions & {
  timeout?: number;
};

type ReportPeriod = '1d' | '7d' | '30d';

type RouteStopForRecalc = {
  id: string;
  sequence: number;
  taskId: string;
  type: StopType;
  status: StopStatus;
  etaS: number;
  departureS: number;
  actualArrivalS: number | null;
  task: {
    title: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    pickupServiceMinutes: number;
  };
};

type DailySummaryInternal = {
  date: string;
  tasks: number;
  completed: number;
  plans: number;
  publishedPlans: number;
};

export type OptimizeJobResponse = {
  jobId: string;
  status: JobStatus;
  startedAt: Date | null;
  estimatedTimeSeconds: number;
};

export type PlanningJobStatusResponse = {
  jobId: string;
  status: JobStatus;
  progressPercent: number;
  planId: string | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export type PlanListItemResponse = {
  planId: string;
  date: string;
  status: PlanStatus;
  createdAt: Date;
  routeCount: number;
  taskCount: number;
};

export type PlanDetailsResponse = {
  planId: string;
  date: string;
  status: PlanStatus;
  routes: Array<{
    driverId: string;
    driverName: string;
    routeId: string;
    totalDistanceKm: number;
    totalTimeMinutes: number;
    stops: Array<{
      stopId: string;
      sequence: number;
      taskId: string;
      type: 'pickup' | 'dropoff';
      etaSeconds: number;
      departureSeconds: number;
      status: string;
      locked: boolean;
      manuallyAssigned: boolean;
      task: {
        title: string;
        pickupAddress: string;
        dropoffAddress: string;
        priority: string;
        pickupLat: number;
        pickupLng: number;
        dropoffLat: number;
        dropoffLng: number;
      };
    }>;
  }>;
  unassigned: Array<{
    taskId: string;
    title: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    priority: string;
    reason: string;
  }>;
};

export type PublishPlanResponse = {
  planId: string;
  status: PlanStatus;
  publishedAt: Date | null;
  notifiedDrivers: number;
};

export type StopStatusUpdateResponse = {
  stopId: string;
  status: StopStatus;
  nextStop: {
    stopId: string;
    sequence: number;
    taskId: string;
    type: StopType;
    etaSeconds: number;
    task: {
      title: string;
      pickupAddress: string;
      dropoffAddress: string;
    };
  } | null;
};

export type DispatcherMonitorResponse = {
  date: string;
  planId: string | null;
  overview: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    delays: number;
  };
  drivers: Array<{
    id: string;
    name: string;
    phone: string;
    vehicle: null;
    status: 'on_route' | 'at_stop' | 'completed';
    /** false if marked unavailable for the day (Availability.available = false
     *  OR shiftEndOverride set via an Incidents action). */
    available: boolean;
    /** When the driver became unavailable today, HH:MM. Null if available
     *  or if the override has not been applied. */
    unavailableFromTime: string | null;
    currentStop: {
      stopId: string;
      sequence: number;
      taskId: string;
      address: string;
      scheduledArrival: string;
      etaSeconds: number;
    } | null;
    progress: {
      completed: number;
      total: number;
    };
  }>;
  recentEvents: Array<{
    time: string;
    driverId: string;
    driverName: string;
    event: string;
    type: 'success' | 'warning' | 'info';
  }>;
};

export type DispatcherImpactResponse = {
  date: string;
  hasPlan: boolean;
  tasksCompleted: number;
  tasksAssigned: number;
  driversActive: number;
  unassignedCount: number;
  optimizedDistanceKm: number;
  naiveBaselineKm: number;
  kmSaved: number;
  savingsPercent: number;
  co2KgSaved: number;
  fuelLitersSaved: number;
  dieselCostSavedDZD: number;
};

export type DispatcherReportsResponse = {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  kpis: {
    avgPlanTime: number;
    avgDailyCompletionRate: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalPlans: number;
    publishedPlans: number;
  };
  dailySummary: Array<{
    date: string;
    tasks: number;
    completed: number;
    completionRate: number;
    plans: number;
    publishedPlans: number;
  }>;
  driverPerformance: Array<{
    driverId: string;
    driverName: string;
    assignedTasks: number;
    completedStops: number;
    completionRate: number;
  }>;
  unassignedAnalysis: {
    totalUnassigned: number;
    jobsAnalyzed: number;
    byReason: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
};

@Injectable()
export class PlanningService {
  private readonly publishLogger = new Logger('PlanningService.publish');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPTIMIZATION_QUEUE)
    private readonly optimizationQueue: Queue<OptimizationQueuePayload>,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  async optimize(dto: OptimizeDto, currentUser: AuthenticatedUser): Promise<OptimizeJobResponse> {
    const targetDate = this.parseDate(dto.date);
    const { start, end } = this.getDayRange(targetDate);

    const [pendingTaskCount, activeDrivers, config] = await Promise.all([
      this.prisma.task.count({
        where: {
          status: TaskStatus.pending,
          approvalStatus: 'approved',
          pickupWindowStart: {
            gte: start,
            lt: end,
          },
        },
      }),
      this.prisma.driver.findMany({
        where: { active: true },
        select: { id: true },
      }),
      this.prisma.config.findUnique({
        where: { id: 1 },
        select: { maxSolveSeconds: true, speedKmh: true },
      }),
    ]);

    if (pendingTaskCount === 0) {
      throw new BadRequestException('No pending tasks for date');
    }

    if (activeDrivers.length === 0) {
      throw new BadRequestException('No active drivers available for date');
    }

    const availabilityRows = await this.prisma.availability.findMany({
      where: {
        date: targetDate,
        driverId: { in: activeDrivers.map((driver) => driver.id) },
      },
      select: {
        driverId: true,
        available: true,
      },
    });
    const availabilityByDriverId = new Map(
      availabilityRows.map((availabilityRow) => [availabilityRow.driverId, availabilityRow.available]),
    );
    const availableDriverCount = activeDrivers.filter(
      (driver) => availabilityByDriverId.get(driver.id) ?? true,
    ).length;

    if (availableDriverCount === 0) {
      throw new BadRequestException('No available drivers for date');
    }

    if (!config) {
      throw new InternalServerErrorException('Config not found');
    }

    const returnToDepot = dto.returnToDepot ?? false;
    const optimizationJob = await this.prisma.optimizationJob.create({
      data: {
        createdById: currentUser.id,
        status: JobStatus.queued,
        requestSnapshot: {
          date: dto.date,
          returnToDepot,
        },
      },
      select: {
        id: true,
      },
    });

    const timeoutMs = (config.maxSolveSeconds + 30) * 1000;
    const queuePayload: OptimizationQueuePayload = {
      jobId: optimizationJob.id,
      date: dto.date,
      returnToDepot,
    };
    const queueOptions: QueueJobOptions = {
      jobId: optimizationJob.id,
      timeout: timeoutMs,
    };
    await this.optimizationQueue.add('optimization', queuePayload, queueOptions);

    return {
      jobId: optimizationJob.id,
      status: JobStatus.queued,
      startedAt: null,
      estimatedTimeSeconds: config.maxSolveSeconds + 30,
    };
  }

  async getStatus(jobId: string): Promise<PlanningJobStatusResponse> {
    const optimizationJob = await this.prisma.optimizationJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        planId: true,
        error: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    if (!optimizationJob) {
      throw new NotFoundException('Optimization job not found');
    }

    return {
      jobId: optimizationJob.id,
      status: optimizationJob.status,
      progressPercent: optimizationJob.progressPercent,
      planId: optimizationJob.planId,
      error: optimizationJob.error,
      startedAt: optimizationJob.startedAt,
      finishedAt: optimizationJob.finishedAt,
    };
  }

  async listPlans(): Promise<PlanListItemResponse[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        routes: {
          select: {
            _count: {
              select: { stops: true },
            },
          },
        },
      },
    });

    return plans.map((plan) => {
      const stopCount = plan.routes.reduce((sum, route) => sum + route._count.stops, 0);
      return {
        planId: plan.id,
        date: this.toDateString(plan.date),
        status: plan.status,
        createdAt: plan.createdAt,
        routeCount: plan.routes.length,
        taskCount: stopCount / 2,
      };
    });
  }

  async getPlan(planId: string): Promise<PlanDetailsResponse> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        routes: {
          orderBy: { id: 'asc' },
          include: {
            driver: {
              select: {
                name: true,
              },
            },
            stops: {
              orderBy: { sequence: 'asc' },
              include: {
                task: {
                  select: {
                    title: true,
                    pickupAddress: true,
                    pickupLat: true,
                    pickupLng: true,
                    dropoffAddress: true,
                    dropoffLat: true,
                    dropoffLng: true,
                    priority: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const latestJob = await this.prisma.optimizationJob.findFirst({
      where: { planId },
      orderBy: [{ finishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { resultSnapshot: true },
    });

    // The optimizer's resultSnapshot freezes what it couldn't fit AT THAT
    // RUN. Mid-day re-optimization and urgent-interrupt later splice some of
    // those tasks onto routes, but the snapshot never gets rewritten — so we
    // must filter out anything that has actually been placed on a stop or
    // whose Task.status is no longer `pending` (assigned/cancelled).
    const stopTaskIds = new Set(
      plan.routes.flatMap((r) => r.stops.map((s) => s.taskId)),
    );
    const rawUnassigned = this.extractUnassigned(latestJob?.resultSnapshot ?? null);
    const stillPendingIds = rawUnassigned.length
      ? new Set(
          (
            await this.prisma.task.findMany({
              where: {
                id: { in: rawUnassigned.map((u) => u.taskId) },
                status: TaskStatus.pending,
              },
              select: { id: true },
            })
          ).map((t) => t.id),
        )
      : new Set<string>();
    const unassignedWithReason = rawUnassigned.filter(
      (entry) => !stopTaskIds.has(entry.taskId) && stillPendingIds.has(entry.taskId),
    );
    const unassignedTaskIds = unassignedWithReason.map((entry) => entry.taskId);
    const unassignedTasks = unassignedTaskIds.length
      ? await this.prisma.task.findMany({
          where: { id: { in: unassignedTaskIds } },
          select: {
            id: true,
            title: true,
            pickupAddress: true,
            pickupLat: true,
            pickupLng: true,
            dropoffAddress: true,
            dropoffLat: true,
            dropoffLng: true,
            priority: true,
          },
        })
      : [];
    const taskById = new Map(unassignedTasks.map((task) => [task.id, task]));

    return {
      planId: plan.id,
      date: this.toDateString(plan.date),
      status: plan.status,
      routes: plan.routes.map((route) => ({
        driverId: route.driverId,
        driverName: route.driver.name,
        routeId: route.id,
        totalDistanceKm: Number((route.totalDistanceM / 1000).toFixed(2)),
        totalTimeMinutes: Number((route.totalTimeS / 60).toFixed(1)),
        stops: route.stops.map((stop) => ({
          stopId: stop.id,
          sequence: stop.sequence,
          taskId: stop.taskId,
          type: stop.type,
          etaSeconds: stop.etaS,
          departureSeconds: stop.departureS,
          status: stop.status,
          locked: stop.locked,
          manuallyAssigned: stop.manuallyAssigned,
          task: {
            title: stop.task.title,
            pickupAddress: stop.task.pickupAddress,
            pickupLat: stop.task.pickupLat,
            pickupLng: stop.task.pickupLng,
            dropoffAddress: stop.task.dropoffAddress,
            dropoffLat: stop.task.dropoffLat,
            dropoffLng: stop.task.dropoffLng,
            priority: stop.task.priority,
          },
        })),
      })),
      unassigned: unassignedWithReason.map((entry) => {
        const task = taskById.get(entry.taskId);
        return {
          taskId: entry.taskId,
          title: task?.title ?? '',
          pickupAddress: task?.pickupAddress ?? '',
          dropoffAddress: task?.dropoffAddress ?? '',
          pickupLat: task?.pickupLat ?? 0,
          pickupLng: task?.pickupLng ?? 0,
          dropoffLat: task?.dropoffLat ?? 0,
          dropoffLng: task?.dropoffLng ?? 0,
          priority: task?.priority ?? 'normal',
          reason: entry.reason,
        };
      }),
    };
  }

  async publishPlan(planId: string): Promise<PublishPlanResponse> {
    const existingPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingPlan) {
      throw new NotFoundException('Plan not found');
    }

    if (existingPlan.status !== PlanStatus.draft) {
      throw new ConflictException('Only draft plans can be published');
    }

    const publishedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        status: PlanStatus.published,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        date: true,
        status: true,
        publishedAt: true,
        routes: {
          select: {
            driverId: true,
            driver: { select: { name: true, phone: true } },
            stops: {
              orderBy: { sequence: 'asc' },
              select: {
                sequence: true,
                type: true,
                etaS: true,
                task: {
                  select: {
                    title: true,
                    pickupAddress: true,
                    dropoffAddress: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    void this.notifyDriversOfPublishedPlan(publishedPlan);

    return {
      planId: publishedPlan.id,
      status: publishedPlan.status,
      publishedAt: publishedPlan.publishedAt,
      notifiedDrivers: new Set(publishedPlan.routes.map((route) => route.driverId)).size,
    };
  }

  private async notifyDriversOfPublishedPlan(plan: {
    id: string;
    date: Date;
    routes: Array<{
      driverId: string;
      driver: { name: string; phone: string };
      stops: Array<{
        sequence: number;
        type: StopType;
        etaS: number;
        task: { title: string; pickupAddress: string; dropoffAddress: string };
      }>;
    }>;
  }): Promise<void> {
    const destination =
      this.configService.get<string>('SMS_TEST_OVERRIDE_NUMBER') ?? '0556495709';
    const planDateLabel = plan.date.toISOString().slice(0, 10);

    const route = plan.routes.find((r) => r.stops.length > 0) ?? plan.routes[0];
    if (!route) {
      this.publishLogger.warn(`Plan ${plan.id} has no routes — skipping test SMS`);
      return;
    }

    const lines = [`Bonjour ${route.driver.name}, votre tournee du ${planDateLabel}:`];
    route.stops.forEach((stop, idx) => {
      const eta = this.formatEtaSeconds(stop.etaS);
      const address =
        stop.type === StopType.pickup ? stop.task.pickupAddress : stop.task.dropoffAddress;
      const action = stop.type === StopType.pickup ? 'Retrait' : 'Livraison';
      lines.push(`${idx + 1}. ${eta} ${action} - ${stop.task.title} (${address})`);
    });
    lines.push('Bonne journee.');
    const message = lines.join('\n');

    try {
      const result = await this.smsService.send(destination, message, 'fr');
      if (!result.success) {
        this.publishLogger.warn(
          `Test SMS to ${destination} not delivered: ${result.providerResponse}`,
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      this.publishLogger.error(`Test SMS to ${destination} threw: ${reason}`);
    }
  }

  async sendTestSms(): Promise<{
    success: boolean;
    code: string | null;
    messageId: string | null;
    providerResponse: string;
    destination: string;
  }> {
    const destination =
      this.configService.get<string>('SMS_TEST_OVERRIDE_NUMBER') ?? '0556495709';
    const message = `TMS test SMS — ${new Date().toISOString()}`;
    this.publishLogger.log(`Sending test SMS to ${destination}`);
    const result = await this.smsService.send(destination, message, 'fr');
    return { ...result, destination };
  }

  private formatEtaSeconds(etaS: number): string {
    const total = Math.max(0, Math.floor(etaS));
    const h = Math.floor(total / 3600) % 24;
    const m = Math.floor((total % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  async updateStopStatus(
    stopId: string,
    dto: UpdateStopStatusDto,
    currentUser: AuthenticatedUser,
  ): Promise<StopStatusUpdateResponse> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      include: {
        route: {
          select: {
            id: true,
            plan: {
              select: {
                status: true,
              },
            },
          },
        },
        task: {
          select: {
            pickupLat: true,
            pickupLng: true,
            dropoffLat: true,
            dropoffLng: true,
            pickupServiceMinutes: true,
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    if (stop.route.plan.status !== PlanStatus.published) {
      throw new BadRequestException('Plan is still in draft status');
    }

    if (!this.isAllowedStopTransition(stop.status, dto.status)) {
      throw new ConflictException('Invalid stop status transition');
    }

    const config = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { speedKmh: true },
    });
    const speedKmh = config?.speedKmh ?? 50;

    const actualArrivalS = dto.actualArrivalTime
      ? this.parseTimeToSeconds(dto.actualArrivalTime)
      : stop.actualArrivalS ?? stop.etaS;
    const normalizedNotes =
      dto.notes === undefined ? stop.notes : dto.notes.trim().length > 0 ? dto.notes.trim() : null;
    const serviceSeconds =
      dto.status === StopStatus.skipped
        ? 0
        : this.getServiceSeconds(stop.type, {
            pickupServiceMinutes: stop.task.pickupServiceMinutes,
          });
    const departureS = Math.max(stop.departureS, actualArrivalS + serviceSeconds);
    const completedAt = dto.status === StopStatus.done ? new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      const updatedStop = await tx.stop.update({
        where: { id: stopId },
        data: {
          status: dto.status,
          notes: normalizedNotes,
          actualArrivalS,
          completedAt,
          departureS,
        },
      });

      await tx.stopEvent.create({
        data: {
          stopId: updatedStop.id,
          status: dto.status,
          notes: normalizedNotes,
          createdBy: currentUser.id,
        },
      });

      const routeStops = (await tx.stop.findMany({
        where: { routeId: stop.route.id },
        orderBy: { sequence: 'asc' },
        select: {
          id: true,
          sequence: true,
          taskId: true,
          type: true,
          status: true,
          etaS: true,
          departureS: true,
          actualArrivalS: true,
          task: {
            select: {
              title: true,
              pickupAddress: true,
              dropoffAddress: true,
              pickupLat: true,
              pickupLng: true,
              dropoffLat: true,
              dropoffLng: true,
              pickupServiceMinutes: true,
            },
          },
        },
      })) as RouteStopForRecalc[];

      const currentIndex = routeStops.findIndex((routeStop) => routeStop.id === updatedStop.id);
      if (currentIndex === -1) {
        throw new NotFoundException('Stop not found');
      }

      let previousStop = routeStops[currentIndex];
      let previousDepartureS = previousStop.departureS;

      for (let index = currentIndex + 1; index < routeStops.length; index += 1) {
        const downstreamStop = routeStops[index];
        const travelSeconds = this.getTravelSeconds(previousStop, downstreamStop, speedKmh);
        const nextEtaS = previousDepartureS + travelSeconds;
        const nextDepartureS = nextEtaS + this.getServiceSeconds(downstreamStop.type, downstreamStop.task);

        routeStops[index] = {
          ...downstreamStop,
          etaS: nextEtaS,
          departureS: nextDepartureS,
        };

        await tx.stop.update({
          where: { id: downstreamStop.id },
          data: {
            etaS: nextEtaS,
            departureS: nextDepartureS,
          },
        });

        previousStop = routeStops[index];
        previousDepartureS = nextDepartureS;
      }

      const nextStop =
        routeStops
          .slice(currentIndex + 1)
          .find(
            (routeStop) =>
              routeStop.status === StopStatus.pending || routeStop.status === StopStatus.arrived,
          ) ?? null;
      return {
        stopId: updatedStop.id,
        status: updatedStop.status,
        nextStop: nextStop
          ? {
              stopId: nextStop.id,
              sequence: nextStop.sequence,
              taskId: nextStop.taskId,
              type: nextStop.type,
              etaSeconds: nextStop.etaS,
              task: {
                title: nextStop.task.title,
                pickupAddress: nextStop.task.pickupAddress,
                dropoffAddress: nextStop.task.dropoffAddress,
              },
            }
          : null,
      };
    });
  }

  async getMonitor(date?: string): Promise<DispatcherMonitorResponse> {
    const targetDate = date ? this.parseDate(date) : this.parseDate(this.toDateString(new Date()));
    const dateString = this.toDateString(targetDate);
    const { start, end } = this.getDayRange(targetDate);

    const plan = await this.prisma.plan.findFirst({
      where: {
        date: targetDate,
        status: PlanStatus.published,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        routes: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            stops: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                sequence: true,
                taskId: true,
                type: true,
                status: true,
                etaS: true,
                actualArrivalS: true,
                task: {
                  select: {
                    title: true,
                    pickupAddress: true,
                    dropoffAddress: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return {
        date: dateString,
        planId: null,
        overview: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          delays: 0,
        },
        drivers: [],
        recentEvents: [],
      };
    }

    // Load availability so the UI can mark drivers as Not Available when
    // a dispatcher has cut their shift short via the Incidents flow.
    const availabilityRows = await this.prisma.availability.findMany({
      where: {
        date: targetDate,
        driverId: { in: plan.routes.map((r) => r.driver.id) },
      },
      select: {
        driverId: true,
        available: true,
        shiftEndOverride: true,
      },
    });
    const availabilityByDriverId = new Map(
      availabilityRows.map((row) => [row.driverId, row]),
    );

    const stops = plan.routes.flatMap((route) => route.stops);
    const taskStops = new Map<string, (typeof stops)[number][]>();
    for (const stop of stops) {
      const existing = taskStops.get(stop.taskId) ?? [];
      existing.push(stop);
      taskStops.set(stop.taskId, existing);
    }

    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    for (const groupedStops of taskStops.values()) {
      const isCompleted = groupedStops.every((stop) => stop.status === StopStatus.done);
      const isInProgress = groupedStops.some(
        (stop) => stop.status === StopStatus.arrived || stop.status === StopStatus.done,
      );
      const isPending = groupedStops.every((stop) => stop.status === StopStatus.pending);
      if (isCompleted) {
        completed += 1;
      } else if (isInProgress) {
        inProgress += 1;
      } else if (isPending) {
        pending += 1;
      } else {
        pending += 1;
      }
    }

    const isToday = dateString === this.toDateString(new Date());
    const referenceSeconds = this.getReferenceSecondsForDate(dateString);
    const delays = isToday
      ? stops.filter((stop) => stop.status === StopStatus.pending && stop.etaS < referenceSeconds).length
      : 0;

    const drivers = plan.routes.map((route) => {
      const totalStops = route.stops.length;
      const completedStops = route.stops.filter(
        (stop) => stop.status === StopStatus.done || stop.status === StopStatus.skipped,
      ).length;
      const hasArrived = route.stops.some((stop) => stop.status === StopStatus.arrived);
      const status: 'on_route' | 'at_stop' | 'completed' =
        totalStops > 0 && completedStops === totalStops
          ? 'completed'
          : hasArrived
            ? 'at_stop'
            : 'on_route';

      const currentStop =
        route.stops.find((stop) => stop.status === StopStatus.arrived) ??
        route.stops.find((stop) => stop.status === StopStatus.pending) ??
        null;

      const availability = availabilityByDriverId.get(route.driver.id);
      const unavailableFromTime = availability?.shiftEndOverride ?? null;
      // Driver is off when explicitly marked unavailable OR when an early
      // shift-end override is in place (the Incidents "Mark Unavailable"
      // flow uses this without flipping the available flag).
      const available =
        !!availability && (availability.available === false || availability.shiftEndOverride)
          ? false
          : true;

      return {
        id: route.driver.id,
        name: route.driver.name,
        phone: route.driver.phone,
        vehicle: null,
        status,
        available,
        unavailableFromTime,
        currentStop: currentStop
          ? {
              stopId: currentStop.id,
              sequence: currentStop.sequence,
              taskId: currentStop.taskId,
              address:
                currentStop.type === StopType.pickup
                  ? currentStop.task.pickupAddress
                  : currentStop.task.dropoffAddress,
              scheduledArrival: this.toHHMM(currentStop.etaS),
              etaSeconds: currentStop.etaS,
            }
          : null,
        progress: {
          completed: completedStops,
          total: totalStops,
        },
      };
    });

    const recentEvents = await this.prisma.stopEvent.findMany({
      where: {
        stop: {
          route: {
            planId: plan.id,
          },
        },
        timestamp: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        timestamp: true,
        status: true,
        stop: {
          select: {
            sequence: true,
            task: {
              select: {
                title: true,
              },
            },
            route: {
              select: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      date: dateString,
      planId: plan.id,
      overview: {
        total: taskStops.size,
        completed,
        inProgress,
        pending,
        delays,
      },
      drivers,
      recentEvents: recentEvents.map((event) => ({
        time: this.toHHMM(
          event.timestamp.getUTCHours() * 3600 +
            event.timestamp.getUTCMinutes() * 60 +
            event.timestamp.getUTCSeconds(),
        ),
        driverId: event.stop.route.driver.id,
        driverName: event.stop.route.driver.name,
        event: `Stop #${event.stop.sequence} marked ${event.status} — ${event.stop.task.title}`,
        type:
          event.status === StopStatus.done
            ? 'success'
            : event.status === StopStatus.skipped
              ? 'warning'
              : 'info',
      })),
    };
  }

  /**
   * Daily impact KPIs. Compares the optimized routes for the date against a
   * naive single-trip-per-task baseline (depot → pickup → dropoff → depot
   * for every assigned task) to estimate distance saved, then derives CO2,
   * fuel, and cost savings using configurable constants on `Config`.
   *
   * Honest framing: the baseline assumes every task would otherwise be done
   * as its own round trip from the depot. That is an industry-standard VRP
   * benchmark, not a measurement of what would actually happen without the
   * system, but it gives a defensible, monotonic "impact" headline number.
   */
  async getImpact(date?: string): Promise<DispatcherImpactResponse> {
    const targetDate = date ? this.parseDate(date) : this.parseDate(this.toDateString(new Date()));
    const dateString = this.toDateString(targetDate);

    const [config, plan] = await Promise.all([
      this.prisma.config.findUnique({
        where: { id: 1 },
        select: {
          co2GramsPerKm: true,
          fuelLPer100Km: true,
          dieselPricePerLiterDZD: true,
        },
      }),
      this.prisma.plan.findFirst({
        where: { date: targetDate, status: PlanStatus.published },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          routes: {
            include: {
              driver: { select: { depotLat: true, depotLng: true } },
              stops: {
                select: {
                  status: true,
                  type: true,
                  taskId: true,
                  task: {
                    select: {
                      pickupLat: true,
                      pickupLng: true,
                      dropoffLat: true,
                      dropoffLng: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const co2GramsPerKm = config?.co2GramsPerKm ?? 171;
    const fuelLPer100Km = config?.fuelLPer100Km ?? 8;
    const dieselPricePerLiterDZD = config?.dieselPricePerLiterDZD ?? 29;

    const empty: DispatcherImpactResponse = {
      date: dateString,
      hasPlan: false,
      tasksCompleted: 0,
      tasksAssigned: 0,
      driversActive: 0,
      unassignedCount: 0,
      optimizedDistanceKm: 0,
      naiveBaselineKm: 0,
      kmSaved: 0,
      savingsPercent: 0,
      co2KgSaved: 0,
      fuelLitersSaved: 0,
      dieselCostSavedDZD: 0,
    };
    if (!plan) return empty;

    // Throughput
    let tasksCompleted = 0;
    const assignedTaskIds = new Set<string>();
    let optimizedDistanceM = 0;
    let naiveBaselineM = 0;

    for (const route of plan.routes) {
      optimizedDistanceM += route.totalDistanceM;
      const depotLat = route.driver.depotLat;
      const depotLng = route.driver.depotLng;

      // Tasks placed on this route — accumulate the naive baseline:
      // depot → pickup → dropoff → depot for every distinct task.
      const seenTasks = new Set<string>();
      for (const stop of route.stops) {
        if (seenTasks.has(stop.taskId)) continue;
        seenTasks.add(stop.taskId);
        assignedTaskIds.add(stop.taskId);
        naiveBaselineM +=
          haversineMeters(depotLat, depotLng, stop.task.pickupLat, stop.task.pickupLng) +
          haversineMeters(
            stop.task.pickupLat,
            stop.task.pickupLng,
            stop.task.dropoffLat,
            stop.task.dropoffLng,
          ) +
          haversineMeters(stop.task.dropoffLat, stop.task.dropoffLng, depotLat, depotLng);
      }

      // Completed task = its dropoff stop was marked done.
      const doneTaskIds = new Set<string>();
      for (const stop of route.stops) {
        if (stop.type === StopType.dropoff && stop.status === StopStatus.done) {
          doneTaskIds.add(stop.taskId);
        }
      }
      tasksCompleted += doneTaskIds.size;
    }

    // Unassigned: pending tasks for the date that are NOT on any route in this plan.
    const { start, end } = this.getDayRange(targetDate);
    const unassignedCount = await this.prisma.task.count({
      where: {
        status: TaskStatus.pending,
        pickupWindowStart: { gte: start, lt: end },
        id: { notIn: [...assignedTaskIds] },
      },
    });

    const optimizedDistanceKm = optimizedDistanceM / 1000;
    const naiveBaselineKm = naiveBaselineM / 1000;
    const kmSaved = Math.max(0, naiveBaselineKm - optimizedDistanceKm);
    const savingsPercent = naiveBaselineKm > 0 ? (kmSaved / naiveBaselineKm) * 100 : 0;
    const co2KgSaved = (kmSaved * co2GramsPerKm) / 1000;
    const fuelLitersSaved = (kmSaved * fuelLPer100Km) / 100;
    const dieselCostSavedDZD = fuelLitersSaved * dieselPricePerLiterDZD;

    return {
      date: dateString,
      hasPlan: true,
      tasksCompleted,
      tasksAssigned: assignedTaskIds.size,
      driversActive: plan.routes.length,
      unassignedCount,
      optimizedDistanceKm: round1(optimizedDistanceKm),
      naiveBaselineKm: round1(naiveBaselineKm),
      kmSaved: round1(kmSaved),
      savingsPercent: round1(savingsPercent),
      co2KgSaved: round1(co2KgSaved),
      fuelLitersSaved: round1(fuelLitersSaved),
      dieselCostSavedDZD: Math.round(dieselCostSavedDZD),
    };
  }

  async getReports(query: ReportsQueryDto): Promise<DispatcherReportsResponse> {
    const { period, start, end, startDate, endDate } = this.resolveReportRange(query);
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const [plans, completedJobs] = await Promise.all([
      this.prisma.plan.findMany({
        where: {
          date: {
            gte: start,
            lt: endExclusive,
          },
        },
        orderBy: { date: 'asc' },
        include: {
          routes: {
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                },
              },
              stops: {
                select: {
                  taskId: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.optimizationJob.findMany({
        where: {
          status: JobStatus.completed,
          finishedAt: {
            gte: start,
            lt: endExclusive,
          },
        },
        select: {
          startedAt: true,
          finishedAt: true,
          resultSnapshot: true,
        },
      }),
    ]);

    const planDurations = completedJobs
      .filter((job) => job.startedAt && job.finishedAt)
      .map((job) => Math.max(0, Math.round((job.finishedAt!.getTime() - job.startedAt!.getTime()) / 1000)));
    const avgPlanTime =
      planDurations.length > 0
        ? Math.round(planDurations.reduce((sum, duration) => sum + duration, 0) / planDurations.length)
        : 0;

    const dailySummaryMap = new Map<string, DailySummaryInternal>();
    for (const dateKey of this.getDateRange(start, end)) {
      dailySummaryMap.set(dateKey, {
        date: dateKey,
        tasks: 0,
        completed: 0,
        plans: 0,
        publishedPlans: 0,
      });
    }

    const driverPerformance = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        assignedTaskIds: Set<string>;
        totalStops: number;
        completedStops: number;
      }
    >();

    for (const plan of plans) {
      const planDate = this.toDateString(plan.date);
      const daySummary = dailySummaryMap.get(planDate);
      if (!daySummary) {
        continue;
      }

      daySummary.plans += 1;
      if (plan.status === PlanStatus.published) {
        daySummary.publishedPlans += 1;
      }

      const taskStatusByTaskId = new Map<string, StopStatus[]>();

      for (const route of plan.routes) {
        const mutableDriver = driverPerformance.get(route.driver.id) ?? {
          driverId: route.driver.id,
          driverName: route.driver.name,
          assignedTaskIds: new Set<string>(),
          totalStops: 0,
          completedStops: 0,
        };

        for (const stop of route.stops) {
          mutableDriver.totalStops += 1;
          mutableDriver.assignedTaskIds.add(stop.taskId);

          if (stop.status === StopStatus.done) {
            mutableDriver.completedStops += 1;
          }

          const taskStatuses = taskStatusByTaskId.get(stop.taskId) ?? [];
          taskStatuses.push(stop.status);
          taskStatusByTaskId.set(stop.taskId, taskStatuses);
        }

        driverPerformance.set(route.driver.id, mutableDriver);
      }

      daySummary.tasks += taskStatusByTaskId.size;
      daySummary.completed += [...taskStatusByTaskId.values()].filter((statuses) =>
        statuses.every((status) => status === StopStatus.done),
      ).length;
    }

    const dailySummary = [...dailySummaryMap.values()].map((daySummary) => ({
      date: daySummary.date,
      tasks: daySummary.tasks,
      completed: daySummary.completed,
      completionRate:
        daySummary.tasks === 0 ? 0 : Number(((daySummary.completed / daySummary.tasks) * 100).toFixed(1)),
      plans: daySummary.plans,
      publishedPlans: daySummary.publishedPlans,
    }));

    const totalPlans = dailySummary.reduce((sum, day) => sum + day.plans, 0);
    const publishedPlans = dailySummary.reduce((sum, day) => sum + day.publishedPlans, 0);
    const totalTasks = dailySummary.reduce((sum, day) => sum + day.tasks, 0);
    const completedTasks = dailySummary.reduce((sum, day) => sum + day.completed, 0);
    const avgDailyCompletionRate =
      dailySummary.length === 0
        ? 0
        : Number(
            (
              dailySummary.reduce((sum, day) => sum + day.completionRate, 0) / dailySummary.length
            ).toFixed(1),
          );

    const driverPerformanceRows = [...driverPerformance.values()]
      .map((driver) => {
        const completionRate =
          driver.totalStops === 0
            ? 0
            : Number(((driver.completedStops / driver.totalStops) * 100).toFixed(1));

        return {
          driverId: driver.driverId,
          driverName: driver.driverName,
          assignedTasks: driver.assignedTaskIds.size,
          completedStops: driver.completedStops,
          completionRate,
        };
      })
      .sort((first, second) => first.driverName.localeCompare(second.driverName));

    const reasonCount = new Map<string, number>();
    let totalUnassigned = 0;

    for (const completedJob of completedJobs) {
      const unassigned = this.extractUnassigned(completedJob.resultSnapshot ?? null);
      for (const item of unassigned) {
        totalUnassigned += 1;
        reasonCount.set(item.reason, (reasonCount.get(item.reason) ?? 0) + 1);
      }
    }

    const byReason = [...reasonCount.entries()]
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalUnassigned === 0 ? 0 : Number(((count / totalUnassigned) * 100).toFixed(1)),
      }))
      .sort((first, second) => second.count - first.count);

    return {
      period,
      startDate,
      endDate,
      kpis: {
        avgPlanTime,
        avgDailyCompletionRate,
        totalTasks,
        completedTasks,
        completionRate: totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(1)),
        totalPlans,
        publishedPlans,
      },
      dailySummary,
      driverPerformance: driverPerformanceRows,
      unassignedAnalysis: {
        totalUnassigned,
        jobsAnalyzed: completedJobs.length,
        byReason,
      },
    };
  }

  buildDailySummaryCsv(rows: DispatcherReportsResponse['dailySummary']): string {
    const header = ['date', 'tasks', 'completed', 'completionRate', 'plans', 'publishedPlans'];

    const lines = rows.map((row) =>
      [
        row.date,
        row.tasks,
        row.completed,
        row.completionRate,
        row.plans,
        row.publishedPlans,
      ].join(','),
    );

    return [header.join(','), ...lines].join('\n');
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD value');
    }

    return parsed;
  }

  private parseTimeToSeconds(value: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match) {
      throw new BadRequestException('actualArrivalTime must be HH:MM');
    }

    return Number(match[1]) * 3600 + Number(match[2]) * 60;
  }

  private toHHMM(totalSeconds: number): string {
    const normalized = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private getDayRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private isAllowedStopTransition(current: StopStatus, next: StopStatus): boolean {
    // R5.4: dispatcher confirms task progress by phone via two buttons
    // ("Task Started" / "Task Done"), so pending → done in one step is valid
    // alongside the legacy pending → arrived → done flow.
    if (current === StopStatus.pending) {
      return (
        next === StopStatus.arrived ||
        next === StopStatus.done ||
        next === StopStatus.skipped
      );
    }

    if (current === StopStatus.arrived) {
      return next === StopStatus.done;
    }

    return false;
  }

  private getServiceSeconds(
    type: StopType,
    task: { pickupServiceMinutes: number },
  ): number {
    return type === StopType.pickup ? task.pickupServiceMinutes * 60 : 0;
  }

  private getStopCoordinates(
    stop: Pick<RouteStopForRecalc, 'type' | 'task'>,
  ): { lat: number; lng: number } {
    if (stop.type === StopType.pickup) {
      return {
        lat: stop.task.pickupLat,
        lng: stop.task.pickupLng,
      };
    }

    return {
      lat: stop.task.dropoffLat,
      lng: stop.task.dropoffLng,
    };
  }

  private getTravelSeconds(
    previousStop: Pick<RouteStopForRecalc, 'type' | 'task'>,
    nextStop: Pick<RouteStopForRecalc, 'type' | 'task'>,
    speedKmh: number,
  ): number {
    const from = this.getStopCoordinates(previousStop);
    const to = this.getStopCoordinates(nextStop);
    const distanceMeters = this.calculateHaversineDistanceMeters(from.lat, from.lng, to.lat, to.lng);

    if (distanceMeters <= 0) {
      return 0;
    }

    const normalizedSpeedKmh = speedKmh > 0 ? speedKmh : 50;
    const metersPerSecond = (normalizedSpeedKmh * 1000) / 3600;
    return Math.max(1, Math.round(distanceMeters / metersPerSecond));
  }

  private calculateHaversineDistanceMeters(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): number {
    const earthRadiusMeters = 6371000;
    const latDistance = this.toRadians(toLat - fromLat);
    const lngDistance = this.toRadians(toLng - fromLng);

    const fromLatRad = this.toRadians(fromLat);
    const toLatRad = this.toRadians(toLat);

    const a =
      Math.sin(latDistance / 2) ** 2 +
      Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(lngDistance / 2) ** 2;

    return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getReferenceSecondsForDate(dateString: string): number {
    const today = this.toDateString(new Date());

    if (dateString < today) {
      return 24 * 60 * 60 - 1;
    }

    if (dateString > today) {
      return 0;
    }

    const now = new Date();
    return now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  }

  private isStopDelayed(
    stop: { status: StopStatus; etaS: number; actualArrivalS: number | null },
    referenceSeconds: number,
  ): boolean {
    if (stop.status === StopStatus.pending) {
      return stop.etaS < referenceSeconds;
    }

    if (
      (stop.status === StopStatus.arrived || stop.status === StopStatus.done) &&
      stop.actualArrivalS !== null
    ) {
      return stop.actualArrivalS > stop.etaS;
    }

    return false;
  }

  private resolveReportRange(query: ReportsQueryDto): {
    period: ReportPeriod;
    start: Date;
    end: Date;
    startDate: string;
    endDate: string;
  } {
    const period = (query.period ?? '7d') as ReportPeriod;

    let start: Date;
    let end: Date;

    if (query.startDate || query.endDate) {
      start = this.parseDate(query.startDate ?? query.endDate ?? this.toDateString(new Date()));
      end = this.parseDate(query.endDate ?? query.startDate ?? this.toDateString(new Date()));
    } else {
      end = this.parseDate(this.toDateString(new Date()));
      start = new Date(end);
      start.setUTCDate(start.getUTCDate() - (this.periodToDays(period) - 1));
    }

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    return {
      period,
      start,
      end,
      startDate: this.toDateString(start),
      endDate: this.toDateString(end),
    };
  }

  private periodToDays(period: ReportPeriod): number {
    if (period === '1d') {
      return 1;
    }

    if (period === '30d') {
      return 30;
    }

    return 7;
  }

  private getDateRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const cursor = new Date(start);

    while (cursor.getTime() <= end.getTime()) {
      dates.push(this.toDateString(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
  }

  private extractUnassigned(
    snapshot: Prisma.JsonValue | null,
  ): Array<{ taskId: string; reason: string }> {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return [];
    }

    const unassigned = (snapshot as Record<string, unknown>).unassigned;
    if (!Array.isArray(unassigned)) {
      return [];
    }

    return unassigned.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const taskId = (item as Record<string, unknown>).taskId;
      const reason = (item as Record<string, unknown>).reason;
      if (typeof taskId !== 'string' || typeof reason !== 'string') {
        return [];
      }

      return [{ taskId, reason }];
    });
  }
}

// ── Module-private helpers used by getImpact ───────────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
