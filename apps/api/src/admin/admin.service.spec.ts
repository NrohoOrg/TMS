import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AdminService } from './admin.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('AdminService', () => {
  let service: AdminService;

  const prisma = {
    $queryRaw: jest.fn(),
    config: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const redisClient = {
    ping: jest.fn(),
  };

  const redisService = {
    getClient: jest.fn(() => redisClient),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'OPTIMIZER_URL') {
        return 'http://optimizer:8000';
      }
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(
      prisma as any,
      redisService as any,
      configService as unknown as ConfigService,
    );
  });

  it('returns degraded health when optimizer is unavailable', async () => {
    prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    redisClient.ping.mockResolvedValue('PONG');
    mockedAxios.get.mockRejectedValue(new Error('timeout'));

    const out = await service.health();

    expect(out).toEqual({
      status: 'degraded',
      services: {
        db: 'ok',
        redis: 'ok',
        optimizer: 'error',
      },
    });
  });
});
