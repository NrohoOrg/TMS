import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlanStatus, Priority, StopStatus, StopType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  findLastExecutedStopIndex,
  isStopDispatcherCancelled,
} from '../planning/frozen-plan.helpers';
import { ManualPlanningService } from '../planning/manual-planning.service';
import {
  DriverSnapshot,
  ExistingStop,
  OpenTask,
  planMidDayInsertions,
} from './midday-insertion';
import {
  detectViolations,
  DownstreamStopForCheck,
  pickClosestDriver,
  Violation,
} from './urgent-interrupt';

export type DriverUnavailablePreviewResponse = {
  driverId: string;
  driverName: string;
  date: string;
  publishedPlanId: string | null;
  affectedTasks: Array<{
    taskId: string;
    title: string;
    pickupAddress: string;
    dropoffAddress: string;
    priority: string;
    pickupSequence: number;
  }>;
  frozenStopsCount: number;
};

export type DriverUnavailableResponse = {
  driverId: string;
  date: string;
  shiftEndOverride: string;
  releasedTaskIds: string[];
  frozenStopsCount: number;
};

export type MidDayAssignmentSummary = {
  taskId: string;
  taskTitle: string;
  driverId: string;
  driverName: string;
  /** Title of the stop that immediately precedes the new pickup. Null when the
   *  task is inserted at the very start of the driver's route. */
  insertedAfterTaskTitle: string | null;
  /** 1-based sequence the new pickup landed at on the driver's route. */
  pickupSequence: number;
};

export type MidDayResponse = {
  date: string;
  publishedPlanId: string | null;
  assignedCount: number;
  unassigned: Array<{ taskId: string; reason: string }>;
  affectedDriverIds: string[];
  assignments: MidDayAssignmentSummary[];
  /** True when the call ran in preview mode and DID NOT persist anything. */
  dryRun: boolean;
};

export type UrgentInterruptResponse = {
  taskId: string;
  driverId: string;
  driverName: string;
  insertedAtSequence: number;
  fromDepot: boolean;
  distanceM: number;
  violations: Violation[];
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly manualPlanningService: ManualPlanningService,
  ) {}

  /**
   * v1.1 R1.3 — preview the effect of marking a driver unavailable today.
   * Returns the list of pending tasks that would be released, and a count
   * of stops that have already started (these stay with the driver).
   * Read-only; makes no changes.
   */
  async previewDriverUnavailable(
    driverId: string,
    date?: string,
  ): Promise<DriverUnavailablePreviewResponse> {
    const targetDate = this.parseDate(date ?? this.todayStr());

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const plan = await this.findPublishedPlanForDate(targetDate);
    if (!plan) {
      return {
        driverId: driver.id,
        driverName: driver.name,
        date: this.toDateString(targetDate),
        publishedPlanId: null,
        affectedTasks: [],
        frozenStopsCount: 0,
      };
    }

    const route = await this.prisma.route.findFirst({
      where: { planId: plan.id, driverId },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            task: {
              select: {
                title: true,
                pickupAddress: true,
                dropoffAddress: true,
                priority: true,
              },
            },
          },
        },
      },
    });

    if (!route) {
      return {
        driverId: driver.id,
        driverName: driver.name,
        date: this.toDateString(targetDate),
        publishedPlanId: plan.id,
        affectedTasks: [],
        frozenStopsCount: 0,
      };
    }

    const frozenStopsCount = route.stops.filter(
      (stop) => stop.status !== StopStatus.pending,
    ).length;

    // Group stops by taskId. A task is releasable iff BOTH of its stops on
    // this route are still pending. If any sibling is frozen, the task is
    // in progress and stays with the driver.
    const stopsByTaskId = new Map<string, typeof route.stops>();
    for (const stop of route.stops) {
      const list = stopsByTaskId.get(stop.taskId) ?? [];
      list.push(stop);
      stopsByTaskId.set(stop.taskId, list);
    }

    const affectedTasks: DriverUnavailablePreviewResponse['affectedTasks'] = [];
    for (const [taskId, stops] of stopsByTaskId) {
      const allPending = stops.every(
        (stop) => stop.status === StopStatus.pending,
      );
      if (!allPending) continue;
      const pickup = stops.find((stop) => stop.type === 'pickup') ?? stops[0];
      affectedTasks.push({
        taskId,
        title: pickup.task.title,
        pickupAddress: pickup.task.pickupAddress,
        dropoffAddress: pickup.task.dropoffAddress,
        priority: pickup.task.priority,
        pickupSequence: pickup.sequence,
      });
    }
    affectedTasks.sort((a, b) => a.pickupSequence - b.pickupSequence);

    return {
      driverId: driver.id,
      driverName: driver.name,
      date: this.toDateString(targetDate),
      publishedPlanId: plan.id,
      affectedTasks,
      frozenStopsCount,
    };
  }

  /**
   * v1.1 R1.3 — mark a driver unavailable from `fromTime` and atomically
   * release every pending task on their published route back to the pool.
   * Idempotent: re-calling on a driver with no remaining pending stops
   * just re-asserts the availability override and returns an empty list.
   */
  async markDriverUnavailable(input: {
    driverId: string;
    date: string;
    fromTime: string;
    // Captured but not enforced: see DriverUnavailableDto.toTime.
    toTime?: string;
  }): Promise<DriverUnavailableResponse> {
    const start = Date.now();
    const targetDate = this.parseDate(input.date);
    const finalize = (
      releasedTaskIds: string[],
      frozenStopsCount: number,
    ): DriverUnavailableResponse => {
      this.logger.log({
        op: 'markDriverUnavailable',
        durationMs: Date.now() - start,
        driverId: input.driverId,
        releasedTaskCount: releasedTaskIds.length,
        frozenStopsCount,
      });
      return {
        driverId: input.driverId,
        date: this.toDateString(targetDate),
        shiftEndOverride: input.fromTime,
        releasedTaskIds,
        frozenStopsCount,
      };
    };

    const driver = await this.prisma.driver.findUnique({
      where: { id: input.driverId },
      select: { id: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // 1. Always upsert the availability override. Idempotent.
    await this.prisma.availability.upsert({
      where: {
        driverId_date: { driverId: input.driverId, date: targetDate },
      },
      update: { shiftEndOverride: input.fromTime, available: true },
      create: {
        driverId: input.driverId,
        date: targetDate,
        available: true,
        shiftEndOverride: input.fromTime,
      },
    });

    const plan = await this.findPublishedPlanForDate(targetDate);
    if (!plan) {
      return finalize([], 0);
    }

    const route = await this.prisma.route.findFirst({
      where: { planId: plan.id, driverId: input.driverId },
      select: { id: true },
    });

    if (!route) {
      return finalize([], 0);
    }

    // 2. Compute releasable tasks (all-pending pairs) inside a transaction.
    const result = await this.prisma.$transaction(async (tx) => {
      const stops = await tx.stop.findMany({
        where: { routeId: route.id },
        select: { id: true, taskId: true, status: true, type: true },
      });

      const stopsByTaskId = new Map<string, typeof stops>();
      for (const stop of stops) {
        const list = stopsByTaskId.get(stop.taskId) ?? [];
        list.push(stop);
        stopsByTaskId.set(stop.taskId, list);
      }

      const releasedTaskIds: string[] = [];
      const stopIdsToDelete: string[] = [];

      for (const [taskId, taskStops] of stopsByTaskId) {
        const allPending = taskStops.every(
          (s) => s.status === StopStatus.pending,
        );
        if (!allPending) continue;
        releasedTaskIds.push(taskId);
        for (const s of taskStops) stopIdsToDelete.push(s.id);
      }

      if (stopIdsToDelete.length > 0) {
        await tx.stopEvent.deleteMany({
          where: { stopId: { in: stopIdsToDelete } },
        });
        await tx.stop.deleteMany({
          where: { id: { in: stopIdsToDelete } },
        });

        // densify the remaining stops' sequence numbers
        const remaining = await tx.stop.findMany({
          where: { routeId: route.id },
          orderBy: { sequence: 'asc' },
          select: { id: true },
        });
        for (let i = 0; i < remaining.length; i += 1) {
          await tx.stop.update({
            where: { id: remaining[i].id },
            data: { sequence: i },
          });
        }

        await tx.task.updateMany({
          where: { id: { in: releasedTaskIds } },
          data: { status: TaskStatus.pending },
        });
      }

      const frozenStopsCount = stops.filter(
        (s) => s.status !== StopStatus.pending,
      ).length;

      return { releasedTaskIds, frozenStopsCount };
    });

    // 3. Outside the transaction: recalculate the route. The R1.2-enhanced
    // `recalculateRoute` preserves any frozen prefix and only recomputes
    // the (now empty) downstream tail. Safe to call even on a fully
    // emptied route.
    if (result.releasedTaskIds.length > 0) {
      await this.manualPlanningService.recalculateRouteForIncidents(route.id);
    }

    return finalize(result.releasedTaskIds, result.frozenStopsCount);
  }

  /**
   * v1.1 R1.5 — mid-day re-optimization (Path A: greedy in-process insertion).
   * Tries to fit every pending task that isn't yet on a route into the gaps
   * of available drivers' published routes. Frozen / locked stops are not
   * moved. Anything that doesn't fit stays unassigned with a reason code.
   */
  async runMidDayReoptimization(
    date?: string,
    dryRun: boolean = false,
  ): Promise<MidDayResponse> {
    const startedAt = Date.now();
    const targetDate = this.parseDate(date ?? this.todayStr());
    const dateString = this.toDateString(targetDate);
    const finalize = (resp: MidDayResponse): MidDayResponse => {
      this.logger.log({
        op: 'runMidDayReoptimization',
        durationMs: Date.now() - startedAt,
        date: dateString,
        assignedCount: resp.assignedCount,
        unassignedCount: resp.unassigned.length,
        affectedDrivers: resp.affectedDriverIds.length,
        dryRun,
      });
      return resp;
    };

    const plan = await this.findPublishedPlanForDate(targetDate);
    if (!plan) {
      return finalize({
        date: dateString,
        publishedPlanId: null,
        assignedCount: 0,
        unassigned: [],
        affectedDriverIds: [],
        assignments: [],
        dryRun,
      });
    }

    // 1. Gather driver eligibility + their existing routes.
    const drivers = await this.prisma.driver.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        shiftStart: true,
        shiftEnd: true,
        depotLat: true,
        depotLng: true,
        capacityUnits: true,
      },
    });
    if (drivers.length === 0) {
      return finalize({
        date: dateString,
        publishedPlanId: plan.id,
        assignedCount: 0,
        unassigned: [],
        affectedDriverIds: [],
        assignments: [],
        dryRun,
      });
    }

    const availabilityRows = await this.prisma.availability.findMany({
      where: {
        date: targetDate,
        driverId: { in: drivers.map((d) => d.id) },
      },
    });
    const availabilityByDriverId = new Map(
      availabilityRows.map((row) => [row.driverId, row]),
    );

    const eligibleDrivers = drivers.filter((d) => {
      const a = availabilityByDriverId.get(d.id);
      return !a || a.available !== false;
    });

    const routes = await this.prisma.route.findMany({
      where: { planId: plan.id, driverId: { in: eligibleDrivers.map((d) => d.id) } },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            task: {
              select: {
                title: true,
                pickupLat: true,
                pickupLng: true,
                pickupWindowStart: true,
                pickupWindowEnd: true,
                pickupServiceMinutes: true,
                dropoffLat: true,
                dropoffLng: true,
              },
            },
          },
        },
      },
    });
    const routeByDriverId = new Map(routes.map((r) => [r.driverId, r]));

    // 2. Gather the pending pool for the date.
    const { start, end } = this.getDayRange(targetDate);
    const pendingTasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.pending,
        pickupWindowStart: { gte: start, lt: end },
      },
    });

    if (pendingTasks.length === 0) {
      return finalize({
        date: dateString,
        publishedPlanId: plan.id,
        assignedCount: 0,
        unassigned: [],
        affectedDriverIds: [],
        assignments: [],
        dryRun,
      });
    }

    // 3. Build snapshots and run the greedy insertion.
    const config = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { speedKmh: true, dropoffWithinHours: true },
    });
    const speedKmh = config?.speedKmh ?? 40;
    const dropoffWithinSeconds = (config?.dropoffWithinHours ?? 2) * 3600;

    const driverSnapshots: DriverSnapshot[] = eligibleDrivers.map((d) => {
      const availability = availabilityByDriverId.get(d.id);
      const shiftStart = availability?.shiftStartOverride ?? d.shiftStart;
      const shiftEnd = availability?.shiftEndOverride ?? d.shiftEnd;
      const route = routeByDriverId.get(d.id) ?? null;
      const stops = (route?.stops ?? [])
        .filter((s) => !isStopDispatcherCancelled(s))
        .map<ExistingStop>((s) => mapStopToSnapshot(s, dropoffWithinSeconds));

      return {
        id: d.id,
        routeId: route?.id ?? null,
        depot: { lat: d.depotLat, lng: d.depotLng },
        shiftStartS: timeToSeconds(shiftStart),
        shiftEndS: timeToSeconds(shiftEnd),
        capacityUnits: d.capacityUnits,
        stops,
        lastExecutedIndex: findLastExecutedStopIndex(stops as any),
      };
    });

    const openTasks: OpenTask[] = pendingTasks.map((t) => ({
      id: t.id,
      priority: t.priority as Priority,
      pickup: { lat: t.pickupLat, lng: t.pickupLng },
      dropoff: { lat: t.dropoffLat, lng: t.dropoffLng },
      pickupEarliestS: dateToSecondsSinceMidnight(t.pickupWindowStart),
      pickupLatestS: dateToSecondsSinceMidnight(t.pickupWindowEnd),
      dropoffDeadlineS:
        dateToSecondsSinceMidnight(t.pickupWindowStart) + dropoffWithinSeconds,
      pickupServiceS: t.pickupServiceMinutes * 60,
      dropoffServiceS: 0,
      capacityUnits: 1,
    }));

    const result = planMidDayInsertions(driverSnapshots, openTasks, { speedKmh });

    if (result.assignments.length === 0) {
      return finalize({
        date: dateString,
        publishedPlanId: plan.id,
        assignedCount: 0,
        unassigned: result.unassigned,
        affectedDriverIds: [],
        assignments: [],
        dryRun,
      });
    }

    // 4. Persist: insert new stops and flip task statuses, then recalc routes.
    // Group assignments by driver so we can splice into each route exactly once.
    const assignmentsByDriverId = new Map<string, typeof result.assignments>();
    for (const a of result.assignments) {
      const list = assignmentsByDriverId.get(a.driverId) ?? [];
      list.push(a);
      assignmentsByDriverId.set(a.driverId, list);
    }

    if (!dryRun) {
      await this.prisma.$transaction(async (tx) => {
      for (const [driverId, assignmentsForDriver] of assignmentsByDriverId) {
        const route = routeByDriverId.get(driverId);
        if (!route) continue;

        // Re-read existing stops in case the snapshot is stale (defensive).
        const existing = await tx.stop.findMany({
          where: { routeId: route.id },
          orderBy: { sequence: 'asc' },
          select: { id: true, sequence: true },
        });
        // Build a target sequence array. Apply assignments in the same order
        // they were produced so subsequent ones see the prior insertions.
        // We use a "synthetic indices" model:
        //   slot=N inserts AT position N in the current existing list.
        // Convert all assignments to an in-memory list of "items" with stable
        // identifiers ('existing-<id>' or 'new-pickup-<task>' / 'new-dropoff-<task>').
        type Item =
          | { kind: 'existing'; id: string }
          | { kind: 'new-pickup'; taskId: string }
          | { kind: 'new-dropoff'; taskId: string };
        const items: Item[] = existing.map((s) => ({ kind: 'existing', id: s.id }));

        for (const a of assignmentsForDriver) {
          // pickupAfterIndex / dropoffAfterIndex were produced against the
          // working snapshot, which mutates as each assignment is applied.
          // Same applies here.
          items.splice(a.pickupAfterIndex, 0, { kind: 'new-pickup', taskId: a.taskId });
          items.splice(a.dropoffAfterIndex + 1, 0, { kind: 'new-dropoff', taskId: a.taskId });
        }

        // Now re-sequence everything. Existing stops get UPDATEd with new
        // sequence; new ones get CREATEd with sequence + zero ETAs (the
        // recalc will fix them).
        for (let k = 0; k < items.length; k += 1) {
          const it = items[k];
          if (it.kind === 'existing') {
            await tx.stop.update({
              where: { id: it.id },
              data: { sequence: k },
            });
          } else {
            await tx.stop.create({
              data: {
                routeId: route.id,
                taskId: it.taskId,
                sequence: k,
                type: it.kind === 'new-pickup' ? StopType.pickup : StopType.dropoff,
                etaS: 0,
                departureS: 0,
                status: StopStatus.pending,
                manuallyAssigned: true,
              },
            });
          }
        }

        // Flip tasks to assigned.
        const newTaskIds = assignmentsForDriver.map((a) => a.taskId);
        await tx.task.updateMany({
          where: { id: { in: newTaskIds } },
          data: { status: TaskStatus.assigned },
        });
      }
      });
    }

    // 5. Recompute ETAs on every affected route, anchored at the executed prefix.
    const affectedDriverIds = [...assignmentsByDriverId.keys()];
    if (!dryRun) {
      for (const driverId of affectedDriverIds) {
        const route = routeByDriverId.get(driverId);
        if (route) {
          await this.manualPlanningService.recalculateRouteForIncidents(route.id);
        }
      }
    }

    // Build user-friendly assignment summaries for the dispatcher.
    // Each summary names the new task, the driver, and the existing task it
    // was inserted right after (so the dispatcher reads "X added to Mohamed
    // after Y"). Insertion indices are evaluated against each route's
    // PRE-MUTATION stop list, replaying assignments in order so subsequent
    // entries see the expected layout.
    const taskTitleById = new Map(pendingTasks.map((t) => [t.id, t.title]));
    const driverNameById = new Map(drivers.map((d) => [d.id, d.name]));
    const assignmentSummaries: MidDayAssignmentSummary[] = [];
    type WorkingItem =
      | { kind: 'existing'; taskTitle: string }
      | { kind: 'new-pickup'; taskId: string; taskTitle: string }
      | { kind: 'new-dropoff'; taskId: string; taskTitle: string };
    const workingByDriver = new Map<string, WorkingItem[]>();
    for (const [driverId, route] of routeByDriverId) {
      workingByDriver.set(
        driverId,
        route.stops
          .filter((s) => !isStopDispatcherCancelled(s))
          .map<WorkingItem>((s) => ({ kind: 'existing', taskTitle: s.task.title })),
      );
    }
    for (const a of result.assignments) {
      const items = workingByDriver.get(a.driverId) ?? [];
      const taskTitle = taskTitleById.get(a.taskId) ?? '(untitled)';
      const before = a.pickupAfterIndex > 0 ? items[a.pickupAfterIndex - 1] : null;
      assignmentSummaries.push({
        taskId: a.taskId,
        taskTitle,
        driverId: a.driverId,
        driverName: driverNameById.get(a.driverId) ?? '(unknown driver)',
        insertedAfterTaskTitle: before ? before.taskTitle : null,
        pickupSequence: a.pickupAfterIndex + 1,
      });
      items.splice(a.pickupAfterIndex, 0, {
        kind: 'new-pickup',
        taskId: a.taskId,
        taskTitle,
      });
      items.splice(a.dropoffAfterIndex + 1, 0, {
        kind: 'new-dropoff',
        taskId: a.taskId,
        taskTitle,
      });
      workingByDriver.set(a.driverId, items);
    }

    return finalize({
      date: dateString,
      publishedPlanId: plan.id,
      assignedCount: result.assignments.length,
      unassigned: result.unassigned,
      affectedDriverIds,
      assignments: assignmentSummaries,
      dryRun,
    });
  }

  /**
   * v1.1 R1.6 — urgent interrupt. Closest active driver diverts to the
   * urgent task. Insertion at the front of the remaining route. Downstream
   * ETAs are recomputed; any violations are returned for dispatcher
   * follow-up (no auto-reassignment, per spec).
   */
  async runUrgentInterrupt(input: {
    taskId: string;
    date?: string;
  }): Promise<UrgentInterruptResponse> {
    const start = Date.now();
    const targetDate = this.parseDate(input.date ?? this.todayStr());

    const task = await this.prisma.task.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        pickupLat: true,
        pickupLng: true,
        pickupWindowStart: true,
        pickupWindowEnd: true,
        pickupServiceMinutes: true,
        dropoffLat: true,
        dropoffLng: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.priority !== Priority.urgent) {
      throw new BadRequestException('Task is not marked urgent');
    }
    if (task.status !== TaskStatus.pending) {
      throw new ConflictException(
        'Urgent interrupt only applies to pending tasks',
      );
    }

    const plan = await this.findPublishedPlanForDate(targetDate);
    if (!plan) {
      throw new ConflictException('No published plan today');
    }

    // Eligible drivers (spec literal): active=true and Availability.available !== false.
    // Remaining shift slack is NOT a gate; shift overruns surface as violations.
    const drivers = await this.prisma.driver.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        shiftStart: true,
        shiftEnd: true,
        depotLat: true,
        depotLng: true,
      },
    });
    const availabilityRows = await this.prisma.availability.findMany({
      where: {
        date: targetDate,
        driverId: { in: drivers.map((d) => d.id) },
      },
    });
    const availabilityByDriverId = new Map(
      availabilityRows.map((row) => [row.driverId, row]),
    );

    const eligibleDrivers = drivers.filter((d) => {
      const a = availabilityByDriverId.get(d.id);
      return !a || a.available !== false;
    });
    if (eligibleDrivers.length === 0) {
      throw new ConflictException('No active driver available to divert');
    }

    // For each eligible driver, fetch their route + stops to compute "current position".
    const routes = await this.prisma.route.findMany({
      where: { planId: plan.id, driverId: { in: eligibleDrivers.map((d) => d.id) } },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            taskId: true,
            type: true,
            sequence: true,
            status: true,
            etaS: true,
            departureS: true,
            actualArrivalS: true,
            task: {
              select: {
                title: true,
                pickupLat: true,
                pickupLng: true,
                pickupWindowStart: true,
                pickupWindowEnd: true,
                pickupServiceMinutes: true,
                dropoffLat: true,
                dropoffLng: true,
              },
            },
          },
        },
      },
    });
    const routeByDriverId = new Map(routes.map((r) => [r.driverId, r]));

    // Build "current position" inputs.
    const positions = eligibleDrivers.map((d) => {
      const route = routeByDriverId.get(d.id);
      const lastExecIdx = route
        ? findLastExecutedStopIndex(
            route.stops.map((s) => ({
              status: s.status,
              actualArrivalS: s.actualArrivalS,
            })),
          )
        : -1;
      let lastExecutedCoords: { lat: number; lng: number } | null = null;
      if (route && lastExecIdx >= 0) {
        const stop = route.stops[lastExecIdx];
        lastExecutedCoords =
          stop.type === StopType.pickup
            ? { lat: stop.task.pickupLat, lng: stop.task.pickupLng }
            : { lat: stop.task.dropoffLat, lng: stop.task.dropoffLng };
      }
      return {
        id: d.id,
        name: d.name,
        depot: { lat: d.depotLat, lng: d.depotLng },
        lastExecutedCoords,
      };
    });

    const closest = pickClosestDriver(positions, {
      lat: task.pickupLat,
      lng: task.pickupLng,
    });
    if (!closest) {
      throw new ConflictException('No active driver available to divert');
    }

    // Locate or create the route for the chosen driver on this plan.
    let chosenRoute = routeByDriverId.get(closest.driverId);
    if (!chosenRoute) {
      const created = await this.prisma.route.create({
        data: { planId: plan.id, driverId: closest.driverId },
        select: { id: true, driverId: true },
      });
      // Re-fetch with the same shape used above; new route has zero stops.
      chosenRoute = {
        ...created,
        planId: plan.id,
        totalDistanceM: 0,
        totalTimeS: 0,
        stops: [],
      } as unknown as typeof chosenRoute;
    }

    // Decide insertion sequence: just after the last executed stop.
    const sortedStops = chosenRoute!.stops;
    const lastExecIdx = findLastExecutedStopIndex(
      sortedStops.map((s) => ({ status: s.status, actualArrivalS: s.actualArrivalS })),
    );
    const insertAt = lastExecIdx + 1;

    // Single transaction: shift later stops by +2, insert pickup+dropoff at
    // insertAt and insertAt+1, flip Task.status.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE stops SET sequence = sequence + 2 WHERE "routeId" = ${chosenRoute!.id} AND sequence >= ${insertAt}`;
      await tx.stop.create({
        data: {
          routeId: chosenRoute!.id,
          taskId: task.id,
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
          routeId: chosenRoute!.id,
          taskId: task.id,
          sequence: insertAt + 1,
          type: StopType.dropoff,
          etaS: 0,
          departureS: 0,
          status: StopStatus.pending,
          manuallyAssigned: true,
        },
      });
      await tx.task.update({
        where: { id: task.id },
        data: { status: TaskStatus.assigned },
      });
    });

    // Recompute downstream ETAs (R1.2/R1.4-aware: respects executed prefix
    // and bypasses dispatcher-cancelled phantoms).
    await this.manualPlanningService.recalculateRouteForIncidents(chosenRoute!.id);

    // Read the route back to detect violations on the new timeline.
    const refreshed = await this.prisma.route.findUnique({
      where: { id: chosenRoute!.id },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            task: {
              select: {
                title: true,
                pickupWindowEnd: true,
                pickupWindowStart: true,
              },
            },
          },
        },
      },
    });
    if (!refreshed) {
      throw new NotFoundException('Route disappeared after insertion');
    }
    const urgentConfig = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { dropoffWithinHours: true },
    });
    const dropoffWithinSeconds = (urgentConfig?.dropoffWithinHours ?? 2) * 3600;
    const driverInfo = drivers.find((d) => d.id === closest.driverId);
    const shiftEndS = timeToSeconds(
      availabilityByDriverId.get(closest.driverId)?.shiftEndOverride ??
        driverInfo?.shiftEnd ??
        '17:00',
    );
    const downstream: DownstreamStopForCheck[] = refreshed.stops
      .filter(
        (s) =>
          s.status === StopStatus.pending &&
          s.taskId !== task.id, // exclude the inserted urgent task itself
      )
      .map((s) => ({
        stopId: s.id,
        taskId: s.taskId,
        type: s.type === StopType.pickup ? 'pickup' : 'dropoff',
        taskTitle: s.task.title,
        recomputedEtaS: s.etaS,
        earliestArrivalS:
          s.type === StopType.pickup
            ? dateToSecondsSinceMidnight(s.task.pickupWindowStart)
            : 0,
        latestArrivalS:
          s.type === StopType.pickup
            ? dateToSecondsSinceMidnight(s.task.pickupWindowEnd)
            : dateToSecondsSinceMidnight(s.task.pickupWindowStart) + dropoffWithinSeconds,
      }));

    const lastStopEtaS =
      refreshed.stops.length > 0
        ? refreshed.stops[refreshed.stops.length - 1].departureS
        : 0;

    const violations = detectViolations(downstream, shiftEndS, lastStopEtaS);

    const response: UrgentInterruptResponse = {
      taskId: task.id,
      driverId: closest.driverId,
      driverName: closest.driverName,
      insertedAtSequence: insertAt,
      fromDepot: closest.fromDepot,
      distanceM: Math.round(closest.distanceM),
      violations,
    };
    this.logger.log({
      op: 'runUrgentInterrupt',
      durationMs: Date.now() - start,
      taskId: task.id,
      driverId: closest.driverId,
      distanceM: response.distanceM,
      violationCount: violations.length,
    });
    return response;
  }

  /* ── helpers ── */

  private async findPublishedPlanForDate(date: Date) {
    return this.prisma.plan.findFirst({
      where: { date, status: PlanStatus.published },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private getDayRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
}

function timeToSeconds(time: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) return 8 * 3600;
  return Number(m[1]) * 3600 + Number(m[2]) * 60;
}

function dateToSecondsSinceMidnight(value: Date): number {
  return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
}

function mapStopToSnapshot(
  stop: {
    type: StopType;
    taskId: string;
    status: StopStatus;
    etaS: number;
    departureS: number;
    actualArrivalS: number | null;
    task: {
      pickupLat: number;
      pickupLng: number;
      pickupWindowStart: Date;
      pickupWindowEnd: Date;
      pickupServiceMinutes: number;
      dropoffLat: number;
      dropoffLng: number;
    };
  },
  dropoffWithinSeconds: number,
): ExistingStop {
  const isPickup = stop.type === StopType.pickup;
  return {
    type: isPickup ? 'pickup' : 'dropoff',
    taskId: stop.taskId,
    coords: {
      lat: isPickup ? stop.task.pickupLat : stop.task.dropoffLat,
      lng: isPickup ? stop.task.pickupLng : stop.task.dropoffLng,
    },
    serviceS: isPickup ? stop.task.pickupServiceMinutes * 60 : 0,
    earliestArrivalS: isPickup
      ? dateToSecondsSinceMidnight(stop.task.pickupWindowStart)
      : 0,
    latestArrivalS: isPickup
      ? dateToSecondsSinceMidnight(stop.task.pickupWindowEnd)
      : dateToSecondsSinceMidnight(stop.task.pickupWindowStart) + dropoffWithinSeconds,
    locked: true,
    capacityDelta: isPickup ? 1 : -1,
    knownDepartureS:
      stop.status !== StopStatus.pending ? stop.departureS : null,
  };
}
