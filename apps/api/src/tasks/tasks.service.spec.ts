import { ConflictException, BadRequestException } from '@nestjs/common';
import { Role, StopStatus, TaskStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  const prisma = {
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stop: { update: jest.fn() },
    stopEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const manualPlanningService = {
    recalculateRouteForIncidents: jest.fn().mockResolvedValue(undefined),
  };

  const currentUser: AuthenticatedUser = {
    id: 'u1',
    email: 'd@x',
    role: Role.DISPATCHER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    service = new TasksService(prisma as any, manualPlanningService as any);
  });

  it('builds where clause for status and date range', async () => {
    await service.findAll({
      status: TaskStatus.pending,
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      page: 1,
      limit: 20,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TaskStatus.pending,
          pickupWindowStart: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  describe('update — v1.1 R1.2 frozen plan guard', () => {
    const baseDto = { title: 'updated title' };

    it('rejects updates to a cancelled task (v1 behavior preserved)', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.cancelled,
        stops: [],
      });

      await expect(service.update('t1', baseDto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('rejects updates to an in-progress task (pickup arrived)', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        stops: [
          { status: StopStatus.arrived },
          { status: StopStatus.pending },
        ],
      });

      await expect(service.update('t1', baseDto as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('rejects updates to a completed task (all stops done)', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        stops: [
          { status: StopStatus.done },
          { status: StopStatus.done },
        ],
      });

      await expect(service.update('t1', baseDto as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('allows updates to an assigned-but-not-started task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        pickupWindowStart: new Date('2024-01-01T08:00:00Z'),
        pickupWindowEnd: new Date('2024-01-01T12:00:00Z'),
        stops: [
          { status: StopStatus.pending },
          { status: StopStatus.pending },
        ],
      });
      prisma.task.update.mockResolvedValue({ id: 't1' });

      await service.update('t1', baseDto as any);
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('allows updates to a pending task with no stops', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.pending,
        pickupWindowStart: new Date('2024-01-01T08:00:00Z'),
        pickupWindowEnd: new Date('2024-01-01T12:00:00Z'),
        stops: [],
      });
      prisma.task.update.mockResolvedValue({ id: 't1' });

      await service.update('t1', baseDto as any);
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });

  describe('remove — v1.1 R1.4 cancellation', () => {
    it('throws NotFoundException for unknown task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', currentUser)).rejects.toThrow(
        'Task not found',
      );
    });

    it('idempotent no-op for already-cancelled task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.cancelled,
        stops: [],
      });

      await service.remove('t1', currentUser);

      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(manualPlanningService.recalculateRouteForIncidents).not.toHaveBeenCalled();
    });

    it('cancels a pending task with no stops (v1 path)', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.pending,
        stops: [],
      });
      prisma.task.update.mockResolvedValue({});

      await service.remove('t1', currentUser);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TaskStatus.cancelled },
      });
      expect(manualPlanningService.recalculateRouteForIncidents).not.toHaveBeenCalled();
    });

    it('cancels an assigned-not-started task: marks stops skipped, writes events, recalcs route', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        stops: [
          { id: 's1', routeId: 'r1', status: StopStatus.pending },
          { id: 's2', routeId: 'r1', status: StopStatus.pending },
        ],
      });
      prisma.task.update.mockResolvedValue({});
      prisma.stop.update.mockResolvedValue({});
      prisma.stopEvent.create.mockResolvedValue({});

      await service.remove('t1', currentUser);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TaskStatus.cancelled },
      });
      expect(prisma.stop.update).toHaveBeenCalledTimes(2);
      expect(prisma.stop.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: StopStatus.skipped },
      });
      expect(prisma.stopEvent.create).toHaveBeenCalledTimes(2);
      expect(prisma.stopEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stopId: 's1',
          status: StopStatus.skipped,
          createdBy: 'u1',
        }),
      });
      expect(
        manualPlanningService.recalculateRouteForIncidents,
      ).toHaveBeenCalledWith('r1');
      // Single recalc per affected route, not per stop
      expect(
        manualPlanningService.recalculateRouteForIncidents,
      ).toHaveBeenCalledTimes(1);
    });

    it('rejects cancellation of an in-progress task with 409', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        stops: [
          { id: 's1', routeId: 'r1', status: StopStatus.arrived },
          { id: 's2', routeId: 'r1', status: StopStatus.pending },
        ],
      });

      await expect(service.remove('t1', currentUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(manualPlanningService.recalculateRouteForIncidents).not.toHaveBeenCalled();
    });

    it('rejects cancellation of a completed task with 409', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.assigned,
        stops: [
          { id: 's1', routeId: 'r1', status: StopStatus.done },
          { id: 's2', routeId: 'r1', status: StopStatus.done },
        ],
      });

      await expect(service.remove('t1', currentUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });
});
