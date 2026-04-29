import { ConflictException } from '@nestjs/common';
import { PlanStatus, StopStatus, StopType } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { ManualPlanningService } from './manual-planning.service';

describe('ManualPlanningService — v1.1 R1.2 frozen-stop guards', () => {
  let service: ManualPlanningService;

  const prisma = {
    stop: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plan: {
      update: jest.fn(),
    },
  };

  const planningService = {
    getPlan: jest.fn(),
  };

  const currentUser: AuthenticatedUser = {
    id: 'u1',
    email: 'd@x',
    role: 'DISPATCHER' as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ManualPlanningService(
      prisma as any,
      planningService as any,
    );
    prisma.plan.update.mockResolvedValue({});
  });

  describe('updateStop on a frozen stop', () => {
    function frozenStop(extra: Partial<any> = {}) {
      return {
        id: 's1',
        routeId: 'r1',
        sequence: 0,
        type: StopType.pickup,
        status: StopStatus.arrived,
        locked: false,
        notes: null,
        etaS: 0,
        departureS: 0,
        actualArrivalS: null,
        route: {
          id: 'r1',
          plan: { id: 'p1', status: PlanStatus.published },
        },
        ...extra,
      };
    }

    it('allows toggling locked even when stop is frozen', async () => {
      prisma.stop.findUnique.mockResolvedValue(frozenStop());
      prisma.stop.update.mockResolvedValue({ id: 's1', locked: true });

      const result = await service.updateStop('s1', { locked: true } as any, currentUser);

      expect(prisma.stop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: expect.objectContaining({ locked: true }),
        }),
      );
      expect(result.locked).toBe(true);
    });

    it('allows updating notes on a frozen stop on a published plan', async () => {
      prisma.stop.findUnique.mockResolvedValue(frozenStop());
      prisma.stop.update.mockResolvedValue({ id: 's1', notes: 'late' });

      await service.updateStop('s1', { notes: 'late' } as any, currentUser);

      expect(prisma.stop.update).toHaveBeenCalled();
    });

    it('rejects ETA override on a frozen stop even on a draft plan', async () => {
      prisma.stop.findUnique.mockResolvedValue(
        frozenStop({
          route: { id: 'r1', plan: { id: 'p1', status: PlanStatus.draft } },
        }),
      );

      await expect(
        service.updateStop('s1', { etaSecondsOverride: 36000 } as any, currentUser),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.stop.update).not.toHaveBeenCalled();
    });

    it('rejects ETA override on a published plan (v1 behavior preserved)', async () => {
      prisma.stop.findUnique.mockResolvedValue({
        ...frozenStop(),
        status: StopStatus.pending,
      });

      await expect(
        service.updateStop('s1', { etaSecondsOverride: 36000 } as any, currentUser),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.stop.update).not.toHaveBeenCalled();
    });

    it('rejects empty update on a published plan', async () => {
      prisma.stop.findUnique.mockResolvedValue({
        ...frozenStop(),
        status: StopStatus.pending,
      });

      await expect(
        service.updateStop('s1', {} as any, currentUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
