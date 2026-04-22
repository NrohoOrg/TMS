import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlanStatus,
  Prisma,
  StopStatus,
  StopType,
  TaskStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { AddRouteDto } from './dto/add-route.dto';
import { AddTaskToRouteDto } from './dto/add-task-to-route.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { MoveStopDto } from './dto/move-stop.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { PlanDetailsResponse, PlanningService } from './planning.service';

type StopForRecalc = {
  id: string;
  sequence: number;
  type: StopType;
  task: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    pickupServiceMinutes: number;
    dropoffServiceMinutes: number;
  };
};

type RecalcResult = {
  totalDistanceM: number;
  totalTimeS: number;
};

@Injectable()
export class ManualPlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planningService: PlanningService,
  ) {}

  /* ─────────────── Plans ─────────────── */

  async listPlans(query: ListPlansQueryDto) {
    const where: Prisma.PlanWhereInput = {};
    if (query.date) {
      where.date = this.parseDateUtc(query.date);
    }
    if (query.status) {
      where.status = query.status;
    }

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        routes: {
          select: {
            _count: { select: { stops: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return plans.map((plan) => {
      const stopCount = plan.routes.reduce((sum, route) => sum + route._count.stops, 0);
      return {
        planId: plan.id,
        date: plan.date.toISOString().slice(0, 10),
        status: plan.status,
        notes: plan.notes,
        createdAt: plan.createdAt,
        publishedAt: plan.publishedAt,
        lastEditedAt: plan.lastEditedAt,
        routeCount: plan.routes.length,
        taskCount: stopCount / 2,
        createdBy: plan.createdBy,
      };
    });
  }

  async createPlan(dto: CreatePlanDto, currentUser: AuthenticatedUser) {
    const date = this.parseDateUtc(dto.date);

    const plan = await this.prisma.plan.create({
      data: {
        date,
        status: PlanStatus.draft,
        notes: dto.notes,
        createdById: currentUser.id,
        lastEditedAt: new Date(),
        lastEditedById: currentUser.id,
      },
      select: {
        id: true,
        date: true,
        status: true,
        notes: true,
        createdAt: true,
      },
    });

    return {
      planId: plan.id,
      date: plan.date.toISOString().slice(0, 10),
      status: plan.status,
      notes: plan.notes,
      createdAt: plan.createdAt,
    };
  }

  async updatePlan(planId: string, dto: UpdatePlanDto, currentUser: AuthenticatedUser) {
    await this.assertDraftPlan(planId);
    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        notes: dto.notes,
        lastEditedAt: new Date(),
        lastEditedById: currentUser.id,
      },
      select: { id: true, notes: true, lastEditedAt: true },
    });
    return plan;
  }

  async deletePlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        status: true,
        routes: { include: { stops: { select: { taskId: true } } } },
      },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.status !== PlanStatus.draft) {
      throw new ConflictException('Only draft plans can be deleted');
    }

    const taskIds = new Set<string>();
    for (const route of plan.routes) {
      for (const stop of route.stops) taskIds.add(stop.taskId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stopEvent.deleteMany({
        where: { stop: { route: { planId } } },
      });
      await tx.stop.deleteMany({ where: { route: { planId } } });
      await tx.route.deleteMany({ where: { planId } });
      await tx.optimizationJob.updateMany({
        where: { planId },
        data: { planId: null },
      });
      await tx.plan.delete({ where: { id: planId } });

      if (taskIds.size > 0) {
        await tx.task.updateMany({
          where: { id: { in: [...taskIds] } },
          data: { status: TaskStatus.pending },
        });
      }
    });

    return { planId, deleted: true };
  }

  /* ─────────────── Routes ─────────────── */

  async addRoute(planId: string, dto: AddRouteDto, currentUser: AuthenticatedUser) {
    await this.assertDraftPlan(planId);
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
      select: { id: true, active: true, name: true },
    });
    if (!driver || !driver.active) {
      throw new BadRequestException('Driver not found or inactive');
    }

    const existing = await this.prisma.route.findFirst({
      where: { planId, driverId: dto.driverId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Driver already has a route in this plan');
    }

    const route = await this.prisma.route.create({
      data: { planId, driverId: dto.driverId },
      select: { id: true, planId: true, driverId: true },
    });

    await this.touchPlan(planId, currentUser.id);
    return route;
  }

  async deleteRoute(routeId: string, currentUser: AuthenticatedUser) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        plan: { select: { id: true, status: true } },
        stops: { select: { taskId: true } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.plan.status !== PlanStatus.draft) {
      throw new ConflictException('Routes can only be removed from draft plans');
    }

    const taskIds = [...new Set(route.stops.map((stop) => stop.taskId))];

    await this.prisma.$transaction(async (tx) => {
      await tx.stopEvent.deleteMany({ where: { stop: { routeId } } });
      await tx.stop.deleteMany({ where: { routeId } });
      await tx.route.delete({ where: { id: routeId } });
      if (taskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: TaskStatus.pending },
        });
      }
    });

    await this.touchPlan(route.plan.id, currentUser.id);
    return { routeId, deleted: true };
  }

  /* ─────────────── Stops ─────────────── */

  async addTaskToRoute(
    routeId: string,
    dto: AddTaskToRouteDto,
    currentUser: AuthenticatedUser,
  ) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        plan: { select: { id: true, status: true } },
        stops: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.plan.status !== PlanStatus.draft) {
      throw new ConflictException('Stops can only be added to draft plans');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      select: {
        id: true,
        status: true,
        pickupServiceMinutes: true,
        dropoffServiceMinutes: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status === TaskStatus.cancelled) {
      throw new BadRequestException('Cannot assign a cancelled task');
    }

    const alreadyOnAnyRoute = await this.prisma.stop.findFirst({
      where: { taskId: dto.taskId, route: { planId: route.plan.id } },
      select: { id: true },
    });
    if (alreadyOnAnyRoute) {
      throw new ConflictException('Task already assigned to a route in this plan');
    }

    const insertAt =
      dto.insertAtSequence !== undefined && dto.insertAtSequence <= route.stops.length
        ? dto.insertAtSequence
        : route.stops.length;

    await this.prisma.$transaction(async (tx) => {
      // shift sequences from insertAt onward by +2
      await tx.$executeRaw`UPDATE stops SET sequence = sequence + 2 WHERE "routeId" = ${routeId} AND sequence >= ${insertAt}`;

      await tx.stop.create({
        data: {
          routeId,
          taskId: dto.taskId,
          sequence: insertAt,
          type: StopType.pickup,
          etaS: 0,
          departureS: 0,
          status: StopStatus.pending,
          manuallyAssigned: true,
        },
      });
      await tx.stop.create({
        data: {
          routeId,
          taskId: dto.taskId,
          sequence: insertAt + 1,
          type: StopType.dropoff,
          etaS: 0,
          departureS: 0,
          status: StopStatus.pending,
          manuallyAssigned: true,
        },
      });

      await tx.task.update({
        where: { id: dto.taskId },
        data: { status: TaskStatus.assigned },
      });
    });

    await this.recalculateRoute(routeId);
    await this.touchPlan(route.plan.id, currentUser.id);

    return this.planningService.getPlan(route.plan.id);
  }

  async removeStop(stopId: string, currentUser: AuthenticatedUser) {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { plan: { select: { id: true, status: true } } } },
      },
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.route.plan.status !== PlanStatus.draft) {
      throw new ConflictException('Stops can only be removed from draft plans');
    }
    if (stop.locked) throw new ConflictException('Stop is locked');

    const taskId = stop.taskId;
    const planId = stop.route.plan.id;

    // Remove BOTH pickup and dropoff for this task in this plan
    await this.prisma.$transaction(async (tx) => {
      const siblingStops = await tx.stop.findMany({
        where: { taskId, route: { planId } },
        select: { id: true, routeId: true, sequence: true },
      });
      for (const sibling of siblingStops) {
        await tx.stopEvent.deleteMany({ where: { stopId: sibling.id } });
        await tx.stop.delete({ where: { id: sibling.id } });
      }
      // re-densify sequences in any affected routes
      const routeIds = [...new Set(siblingStops.map((s) => s.routeId))];
      for (const routeId of routeIds) {
        await this.densifyRouteSequencesTx(tx, routeId);
      }
      await tx.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.pending },
      });
    });

    const affectedRoutes = await this.prisma.route.findMany({
      where: { planId },
      select: { id: true },
    });
    for (const route of affectedRoutes) {
      await this.recalculateRoute(route.id);
    }

    await this.touchPlan(planId, currentUser.id);
    return this.planningService.getPlan(planId);
  }

  async updateStop(stopId: string, dto: UpdateStopDto, currentUser: AuthenticatedUser) {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { plan: { select: { id: true, status: true } } } },
      },
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.route.plan.status === PlanStatus.published && dto.locked === undefined && dto.notes === undefined) {
      throw new ConflictException('Plan is published');
    }

    const data: Prisma.StopUpdateInput = {};
    if (dto.locked !== undefined) data.locked = dto.locked;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    if (dto.etaSecondsOverride !== undefined) {
      if (stop.route.plan.status !== PlanStatus.draft) {
        throw new ConflictException('ETA can only be overridden for draft plans');
      }
      data.etaS = dto.etaSecondsOverride;
    }

    const updated = await this.prisma.stop.update({
      where: { id: stopId },
      data,
      select: {
        id: true,
        locked: true,
        notes: true,
        etaS: true,
      },
    });

    if (dto.etaSecondsOverride !== undefined) {
      await this.recalculateRoute(stop.routeId, { startSequence: stop.sequence });
    }
    await this.touchPlan(stop.route.plan.id, currentUser.id);
    return updated;
  }

  async moveStop(stopId: string, dto: MoveStopDto, currentUser: AuthenticatedUser) {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { plan: { select: { id: true, status: true } } } },
      },
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.route.plan.status !== PlanStatus.draft) {
      throw new ConflictException('Stops can only be moved in draft plans');
    }
    if (stop.locked) throw new ConflictException('Stop is locked');

    const planId = stop.route.plan.id;
    const sourceRouteId = stop.routeId;
    const targetRouteId = dto.targetRouteId ?? sourceRouteId;

    const targetRoute = await this.prisma.route.findUnique({
      where: { id: targetRouteId },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    if (!targetRoute) throw new NotFoundException('Target route not found');
    if (targetRoute.planId !== planId) {
      throw new BadRequestException('Target route belongs to a different plan');
    }

    // Move BOTH pickup + dropoff together — pickup goes to targetSequence,
    // dropoff goes immediately after. We always preserve pickup-before-dropoff.
    const sibling = await this.prisma.stop.findFirst({
      where: { taskId: stop.taskId, route: { planId }, NOT: { id: stop.id } },
    });
    if (!sibling) {
      throw new BadRequestException('Sibling stop not found for task');
    }

    const pickupStop = stop.type === StopType.pickup ? stop : sibling;
    const dropoffStop = stop.type === StopType.dropoff ? stop : sibling;

    if (pickupStop.locked || dropoffStop.locked) {
      throw new ConflictException('Pickup or dropoff stop is locked');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Remove the pair from their current routes
      await tx.stop.delete({ where: { id: pickupStop.id } });
      await tx.stop.delete({ where: { id: dropoffStop.id } });

      // 2. Densify any affected source routes
      const affected = new Set<string>([pickupStop.routeId, dropoffStop.routeId]);
      for (const routeId of affected) {
        await this.densifyRouteSequencesTx(tx, routeId);
      }

      // 3. Refetch target route stops (now densified)
      const fresh = await tx.stop.findMany({
        where: { routeId: targetRouteId },
        orderBy: { sequence: 'asc' },
      });

      const insertAt = Math.min(Math.max(0, dto.targetSequence), fresh.length);

      // 4. Shift target sequences from insertAt onward by +2
      await tx.$executeRaw`UPDATE stops SET sequence = sequence + 2 WHERE "routeId" = ${targetRouteId} AND sequence >= ${insertAt}`;

      // 5. Insert pickup then dropoff
      await tx.stop.create({
        data: {
          routeId: targetRouteId,
          taskId: pickupStop.taskId,
          sequence: insertAt,
          type: StopType.pickup,
          etaS: 0,
          departureS: 0,
          status: StopStatus.pending,
          manuallyAssigned: true,
          notes: pickupStop.notes,
        },
      });
      await tx.stop.create({
        data: {
          routeId: targetRouteId,
          taskId: dropoffStop.taskId,
          sequence: insertAt + 1,
          type: StopType.dropoff,
          etaS: 0,
          departureS: 0,
          status: StopStatus.pending,
          manuallyAssigned: true,
          notes: dropoffStop.notes,
        },
      });
    });

    await this.recalculateRoute(targetRouteId);
    if (sourceRouteId !== targetRouteId) {
      await this.recalculateRoute(sourceRouteId);
    }
    await this.touchPlan(planId, currentUser.id);

    return this.planningService.getPlan(planId);
  }

  /* ─────────────── Recalculate ─────────────── */

  async recalculatePlan(planId: string, currentUser: AuthenticatedUser): Promise<PlanDetailsResponse> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, status: true, routes: { select: { id: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.status !== PlanStatus.draft) {
      throw new ConflictException('Only draft plans can be recalculated');
    }

    for (const route of plan.routes) {
      await this.recalculateRoute(route.id);
    }
    await this.touchPlan(planId, currentUser.id);
    return this.planningService.getPlan(planId);
  }

  async getUnassignedTasksForDate(date: string) {
    const targetDate = this.parseDateUtc(date);
    const start = new Date(targetDate);
    const end = new Date(targetDate);
    end.setUTCDate(end.getUTCDate() + 1);

    const tasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.pending,
        pickupWindowStart: { gte: start, lt: end },
      },
      orderBy: [{ priority: 'desc' }, { pickupWindowStart: 'asc' }],
      select: {
        id: true,
        title: true,
        pickupAddress: true,
        pickupLat: true,
        pickupLng: true,
        pickupWindowStart: true,
        pickupWindowEnd: true,
        dropoffAddress: true,
        dropoffLat: true,
        dropoffLng: true,
        dropoffDeadline: true,
        priority: true,
        notes: true,
      },
    });

    return tasks;
  }

  /* ─────────────── Helpers ─────────────── */

  private async recalculateRoute(
    routeId: string,
    options?: { startSequence?: number },
  ): Promise<RecalcResult> {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        driver: { select: { shiftStart: true, depotLat: true, depotLng: true } },
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            task: {
              select: {
                pickupLat: true,
                pickupLng: true,
                dropoffLat: true,
                dropoffLng: true,
                pickupServiceMinutes: true,
                dropoffServiceMinutes: true,
              },
            },
          },
        },
      },
    });
    if (!route) return { totalDistanceM: 0, totalTimeS: 0 };

    const config = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { speedKmh: true },
    });
    const speedKmh = config?.speedKmh ?? 40;

    const stops = route.stops as unknown as StopForRecalc[];

    const startSeconds = this.parseShiftStartSeconds(route.driver.shiftStart);
    let prevLat = route.driver.depotLat;
    let prevLng = route.driver.depotLng;
    let cursorSeconds = startSeconds;
    let totalDistanceM = 0;

    for (let i = 0; i < stops.length; i += 1) {
      const stop = stops[i];
      const { lat, lng } = stop.type === StopType.pickup
        ? { lat: stop.task.pickupLat, lng: stop.task.pickupLng }
        : { lat: stop.task.dropoffLat, lng: stop.task.dropoffLng };

      const distanceM = haversineMeters(prevLat, prevLng, lat, lng);
      const travelS = distanceM > 0 ? Math.max(1, Math.round(distanceM / ((speedKmh * 1000) / 3600))) : 0;

      cursorSeconds += travelS;
      const etaS = cursorSeconds;
      const serviceS =
        (stop.type === StopType.pickup ? stop.task.pickupServiceMinutes : stop.task.dropoffServiceMinutes) * 60;
      cursorSeconds += serviceS;
      const departureS = cursorSeconds;

      const skipUpdate =
        options?.startSequence !== undefined && stop.sequence < options.startSequence;
      if (!skipUpdate) {
        await this.prisma.stop.update({
          where: { id: stop.id },
          data: { etaS, departureS },
        });
      }

      totalDistanceM += distanceM;
      prevLat = lat;
      prevLng = lng;
    }

    const totalTimeS = cursorSeconds - startSeconds;

    await this.prisma.route.update({
      where: { id: routeId },
      data: {
        totalDistanceM: Math.round(totalDistanceM),
        totalTimeS,
      },
    });

    return { totalDistanceM, totalTimeS };
  }

  private async densifyRouteSequencesTx(
    tx: Prisma.TransactionClient,
    routeId: string,
  ): Promise<void> {
    const stops = await tx.stop.findMany({
      where: { routeId },
      orderBy: { sequence: 'asc' },
      select: { id: true },
    });
    for (let i = 0; i < stops.length; i += 1) {
      await tx.stop.update({
        where: { id: stops[i].id },
        data: { sequence: i },
      });
    }
  }

  private async assertDraftPlan(planId: string): Promise<void> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, status: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.status !== PlanStatus.draft) {
      throw new ConflictException('Only draft plans can be edited');
    }
  }

  private async touchPlan(planId: string, userId: string): Promise<void> {
    await this.prisma.plan.update({
      where: { id: planId },
      data: { lastEditedAt: new Date(), lastEditedById: userId },
    });
  }

  private parseDateUtc(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  private parseShiftStartSeconds(shiftStart: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(shiftStart);
    if (!match) return 8 * 3600;
    return Number(match[1]) * 3600 + Number(match[2]) * 60;
  }
}

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
