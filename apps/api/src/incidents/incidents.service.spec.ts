import { NotFoundException } from '@nestjs/common';
import { PlanStatus, StopStatus, TaskStatus } from '@prisma/client';
import { IncidentsService } from './incidents.service';

describe('IncidentsService — v1.1 R1.3 driver unavailability', () => {
  let service: IncidentsService;

  const prisma = {
    driver: { findUnique: jest.fn() },
    plan: { findFirst: jest.fn() },
    route: { findFirst: jest.fn() },
    stop: { findMany: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    stopEvent: { deleteMany: jest.fn() },
    task: { updateMany: jest.fn() },
    availability: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };

  const manualPlanningService = {
    recalculateRouteForIncidents: jest.fn().mockResolvedValue(undefined),
  };

  const smsService = {
    resolveDestination: jest.fn((p: string) => p),
    send: jest.fn().mockResolvedValue({ success: true, code: '1701', messageId: '1', providerResponse: 'ok' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentsService(prisma as any, manualPlanningService as any, smsService as any);
  });

  describe('previewDriverUnavailable', () => {
    it('throws NotFoundException for unknown driver', async () => {
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.previewDriverUnavailable('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns empty when no published plan exists today', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1', name: 'Bob' });
      prisma.plan.findFirst.mockResolvedValue(null);

      const result = await service.previewDriverUnavailable('d1', '2026-04-27');

      expect(result.publishedPlanId).toBeNull();
      expect(result.affectedTasks).toEqual([]);
      expect(result.frozenStopsCount).toBe(0);
    });

    it('returns empty when driver has no route on the published plan', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1', name: 'Bob' });
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.route.findFirst.mockResolvedValue(null);

      const result = await service.previewDriverUnavailable('d1', '2026-04-27');

      expect(result.publishedPlanId).toBe('p1');
      expect(result.affectedTasks).toEqual([]);
    });

    it('lists all-pending tasks as affected and counts frozen stops', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1', name: 'Bob' });
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.route.findFirst.mockResolvedValue({
        id: 'r1',
        stops: [
          // Task A: pickup arrived, dropoff pending → in-progress, NOT released
          {
            id: 's1',
            taskId: 'A',
            type: 'pickup',
            sequence: 0,
            status: StopStatus.arrived,
            task: {
              title: 'Task A',
              pickupAddress: 'pa1',
              dropoffAddress: 'da1',
              priority: 'high',
            },
          },
          {
            id: 's2',
            taskId: 'A',
            type: 'dropoff',
            sequence: 1,
            status: StopStatus.pending,
            task: {
              title: 'Task A',
              pickupAddress: 'pa1',
              dropoffAddress: 'da1',
              priority: 'high',
            },
          },
          // Task B: both pending → released
          {
            id: 's3',
            taskId: 'B',
            type: 'pickup',
            sequence: 2,
            status: StopStatus.pending,
            task: {
              title: 'Task B',
              pickupAddress: 'pb1',
              dropoffAddress: 'db1',
              priority: 'normal',
            },
          },
          {
            id: 's4',
            taskId: 'B',
            type: 'dropoff',
            sequence: 3,
            status: StopStatus.pending,
            task: {
              title: 'Task B',
              pickupAddress: 'pb1',
              dropoffAddress: 'db1',
              priority: 'normal',
            },
          },
          // Task C: both done → completed, NOT released
          {
            id: 's5',
            taskId: 'C',
            type: 'pickup',
            sequence: 4,
            status: StopStatus.done,
            task: {
              title: 'Task C',
              pickupAddress: 'pc1',
              dropoffAddress: 'dc1',
              priority: 'low',
            },
          },
          {
            id: 's6',
            taskId: 'C',
            type: 'dropoff',
            sequence: 5,
            status: StopStatus.done,
            task: {
              title: 'Task C',
              pickupAddress: 'pc1',
              dropoffAddress: 'dc1',
              priority: 'low',
            },
          },
        ],
      });

      const result = await service.previewDriverUnavailable('d1', '2026-04-27');

      expect(result.affectedTasks).toHaveLength(1);
      expect(result.affectedTasks[0].taskId).toBe('B');
      expect(result.frozenStopsCount).toBe(3); // s1 arrived + s5 done + s6 done
    });
  });

  describe('markDriverUnavailable', () => {
    it('throws NotFoundException for unknown driver', async () => {
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.markDriverUnavailable({
          driverId: 'missing',
          date: '2026-04-27',
          fromTime: '14:00',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('idempotent no-op when no published plan exists', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1' });
      prisma.availability.upsert.mockResolvedValue({});
      prisma.plan.findFirst.mockResolvedValue(null);

      const result = await service.markDriverUnavailable({
        driverId: 'd1',
        date: '2026-04-27',
        fromTime: '14:00',
      });

      expect(prisma.availability.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId_date: { driverId: 'd1', date: expect.any(Date) } },
          update: { shiftEndOverride: '14:00', available: true },
        }),
      );
      expect(result.releasedTaskIds).toEqual([]);
      expect(manualPlanningService.recalculateRouteForIncidents).not.toHaveBeenCalled();
    });

    it('releases all-pending tasks and recalculates the route', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1' });
      prisma.availability.upsert.mockResolvedValue({});
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.route.findFirst.mockResolvedValue({ id: 'r1' });

      // Inside the transaction, the service calls tx.stop.findMany etc.
      // Wire $transaction to invoke its callback with the same prisma mocks.
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

      // First findMany — group stops; second findMany — densification list.
      prisma.stop.findMany
        .mockResolvedValueOnce([
          { id: 's1', taskId: 'A', type: 'pickup', status: StopStatus.arrived },
          { id: 's2', taskId: 'A', type: 'dropoff', status: StopStatus.pending },
          { id: 's3', taskId: 'B', type: 'pickup', status: StopStatus.pending },
          { id: 's4', taskId: 'B', type: 'dropoff', status: StopStatus.pending },
        ])
        .mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }]); // remaining after delete

      prisma.stop.deleteMany.mockResolvedValue({ count: 2 });
      prisma.stopEvent.deleteMany.mockResolvedValue({ count: 0 });
      prisma.task.updateMany.mockResolvedValue({ count: 1 });
      prisma.stop.update.mockResolvedValue({});

      const result = await service.markDriverUnavailable({
        driverId: 'd1',
        date: '2026-04-27',
        fromTime: '14:00',
      });

      expect(result.releasedTaskIds).toEqual(['B']);
      expect(result.frozenStopsCount).toBe(1); // s1 arrived
      expect(prisma.stop.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['s3', 's4'] } },
      });
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['B'] } },
        data: { status: TaskStatus.pending },
      });
      expect(manualPlanningService.recalculateRouteForIncidents).toHaveBeenCalledWith('r1');
    });

    it('idempotent re-call: no pending stops, no release, no recalc', async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: 'd1' });
      prisma.availability.upsert.mockResolvedValue({});
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.route.findFirst.mockResolvedValue({ id: 'r1' });

      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.stop.findMany.mockResolvedValue([
        { id: 's1', taskId: 'A', type: 'pickup', status: StopStatus.done },
        { id: 's2', taskId: 'A', type: 'dropoff', status: StopStatus.done },
      ]);

      const result = await service.markDriverUnavailable({
        driverId: 'd1',
        date: '2026-04-27',
        fromTime: '14:00',
      });

      expect(result.releasedTaskIds).toEqual([]);
      expect(result.frozenStopsCount).toBe(2);
      expect(prisma.stop.deleteMany).not.toHaveBeenCalled();
      expect(manualPlanningService.recalculateRouteForIncidents).not.toHaveBeenCalled();
    });
  });
});

/**
 * v1.1 R1.7 — performance budgets.
 * The spec requires real-time reactivity: dispatcher operations complete in
 * seconds, not minutes. With mocked Prisma (no DB I/O) the in-process work
 * must finish well under 500ms. These tests catch algorithmic regressions.
 */
describe('IncidentsService — v1.1 R1.7 perf budgets', () => {
  const PERF_BUDGET_MS = 500;

  it('markDriverUnavailable completes under budget on idempotent path', async () => {
    const prisma: any = {
      driver: { findUnique: jest.fn().mockResolvedValue({ id: 'd1' }) },
      plan: { findFirst: jest.fn().mockResolvedValue(null) }, // shortest path
      availability: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const manualPlanningService: any = {
      recalculateRouteForIncidents: jest.fn(),
    };
    const service = new IncidentsService(prisma as any, manualPlanningService as any, { resolveDestination: (p: string) => p, send: async () => ({ success: true, code: "1701", messageId: "1", providerResponse: "ok" }) } as any);

    const t0 = Date.now();
    await service.markDriverUnavailable({
      driverId: 'd1',
      date: '2026-04-27',
      fromTime: '14:00',
    });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS);
  });

  it('runMidDayReoptimization completes under budget on no-plan path', async () => {
    const prisma: any = {
      plan: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const manualPlanningService: any = {
      recalculateRouteForIncidents: jest.fn(),
    };
    const service = new IncidentsService(prisma as any, manualPlanningService as any, { resolveDestination: (p: string) => p, send: async () => ({ success: true, code: "1701", messageId: "1", providerResponse: "ok" }) } as any);

    const t0 = Date.now();
    await service.runMidDayReoptimization('2026-04-27');
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS);
  });

  it('runMidDayReoptimization stays under budget with realistic load (8 drivers, 10 tasks)', async () => {
    // Realistic operational shape: 8 drivers each with a route of 4 existing
    // stops, and a pool of 10 pending tasks. Algorithmic heavy lifting only.
    const drivers = Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`,
      shiftStart: '08:00',
      shiftEnd: '17:00',
      depotLat: 36.7 + i * 0.01,
      depotLng: 3.0 + i * 0.01,
      capacityUnits: null,
    }));
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      priority: 'normal',
      pickupLat: 36.75 + i * 0.005,
      pickupLng: 3.05 + i * 0.005,
      pickupWindowStart: new Date('2026-04-27T09:00:00Z'),
      pickupWindowEnd: new Date('2026-04-27T15:00:00Z'),
      pickupServiceMinutes: 5,
      dropoffLat: 36.78 + i * 0.005,
      dropoffLng: 3.08 + i * 0.005,
    }));

    const prisma: any = {
      plan: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      driver: { findMany: jest.fn().mockResolvedValue(drivers) },
      availability: { findMany: jest.fn().mockResolvedValue([]) },
      route: { findMany: jest.fn().mockResolvedValue([]) },
      task: { findMany: jest.fn().mockResolvedValue(tasks), updateMany: jest.fn() },
      config: { findUnique: jest.fn().mockResolvedValue({ speedKmh: 40 }) },
      stop: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn({
        stop: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), create: jest.fn() },
        task: { updateMany: jest.fn() },
      })),
    };
    const manualPlanningService: any = {
      recalculateRouteForIncidents: jest.fn(),
    };
    const service = new IncidentsService(prisma as any, manualPlanningService as any, { resolveDestination: (p: string) => p, send: async () => ({ success: true, code: "1701", messageId: "1", providerResponse: "ok" }) } as any);

    const t0 = Date.now();
    await service.runMidDayReoptimization('2026-04-27');
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS);
  });

  it('runUrgentInterrupt completes under budget on minimal happy path', async () => {
    const prisma: any = {
      task: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't-urgent',
          title: 'Urgent',
          status: TaskStatus.pending,
          priority: 'urgent',
          pickupLat: 36.75,
          pickupLng: 3.06,
          pickupWindowStart: new Date('2026-04-27T09:00:00Z'),
          pickupWindowEnd: new Date('2026-04-27T15:00:00Z'),
          pickupServiceMinutes: 5,
          dropoffLat: 36.77,
          dropoffLng: 3.08,
        }),
        update: jest.fn(),
      },
      plan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      driver: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'd1',
            name: 'Bob',
            shiftStart: '08:00',
            shiftEnd: '17:00',
            depotLat: 36.75,
            depotLng: 3.06,
          },
        ]),
      },
      availability: { findMany: jest.fn().mockResolvedValue([]) },
      route: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            driverId: 'd1',
            planId: 'p1',
            totalDistanceM: 0,
            totalTimeS: 0,
            stops: [],
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'r1',
          stops: [],
        }),
      },
      stop: { create: jest.fn() },
      config: { findUnique: jest.fn().mockResolvedValue({ dropoffWithinHours: 2 }) },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn({
        $executeRaw: jest.fn(),
        stop: { create: jest.fn() },
        task: { update: jest.fn() },
      })),
    };
    const manualPlanningService: any = {
      recalculateRouteForIncidents: jest.fn(),
    };
    const service = new IncidentsService(prisma as any, manualPlanningService as any, { resolveDestination: (p: string) => p, send: async () => ({ success: true, code: "1701", messageId: "1", providerResponse: "ok" }) } as any);

    const t0 = Date.now();
    await service.runUrgentInterrupt({ taskId: 't-urgent', date: '2026-04-27' });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS);
  });
});
