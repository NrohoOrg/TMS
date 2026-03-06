import { TaskStatus } from '@prisma/client';
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
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);
    service = new TasksService(prisma as any);
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
});
