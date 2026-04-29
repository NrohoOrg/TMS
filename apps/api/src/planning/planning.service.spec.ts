import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PlanningService } from './planning.service';

describe('PlanningService', () => {
  let service: PlanningService;

  const prisma = {
    task: {
      count: jest.fn(),
    },
    driver: {
      findMany: jest.fn(),
    },
    availability: {
      findMany: jest.fn(),
    },
    config: {
      findUnique: jest.fn(),
    },
    optimizationJob: {
      create: jest.fn(),
    },
  };

  const optimizationQueue = {
    add: jest.fn(),
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'dispatcher@example.com',
    role: Role.DISPATCHER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.task.count.mockResolvedValue(2);
    prisma.driver.findMany.mockResolvedValue([{ id: 'driver-1' }]);
    prisma.availability.findMany.mockResolvedValue([]);
    prisma.config.findUnique.mockResolvedValue({ maxSolveSeconds: 30, speedKmh: 50 });
    prisma.optimizationJob.create.mockResolvedValue({ id: 'job-1' });
    optimizationQueue.add.mockResolvedValue(undefined);

    const smsService = { send: jest.fn().mockResolvedValue({ success: true, code: '1701', messageId: 'x', providerResponse: 'ok' }) };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    service = new PlanningService(
      prisma as any,
      optimizationQueue as any,
      smsService as any,
      configService as any,
    );
  });

  it('creates queued optimization job when inputs are valid', async () => {
    const out = await service.optimize({ date: '2026-01-15', returnToDepot: false }, currentUser);

    expect(out).toEqual({
      jobId: 'job-1',
      status: 'queued',
      startedAt: null,
      estimatedTimeSeconds: 60,
    });
    expect(optimizationQueue.add).toHaveBeenCalledWith(
      'optimization',
      expect.objectContaining({
        jobId: 'job-1',
        date: '2026-01-15',
        returnToDepot: false,
      }),
      expect.objectContaining({
        jobId: 'job-1',
      }),
    );
  });
});
