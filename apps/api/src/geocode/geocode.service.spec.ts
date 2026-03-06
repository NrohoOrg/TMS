import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GeocodeService } from './geocode.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('GeocodeService', () => {
  let service: GeocodeService;

  const prisma = {
    geocodeCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const redisClient = {
    set: jest.fn(),
  };

  const redisService = {
    getClient: jest.fn(() => redisClient),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'NOMINATIM_URL') {
        return 'https://nominatim.test';
      }
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeocodeService(
      prisma as any,
      redisService as any,
      config as unknown as ConfigService,
    );
  });

  it('returns fresh cached results without calling nominatim', async () => {
    const cachedResults = [
      {
        placeId: '1',
        displayName: 'Algiers',
        lat: 36.75,
        lng: 3.06,
        type: 'city',
        importance: 0.9,
      },
    ];
    prisma.geocodeCache.findUnique.mockResolvedValue({
      normalizedQuery: 'algiers',
      results: cachedResults,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const out = await service.search({ q: '  ALGIERS  ', limit: 5 } as any);

    expect(out).toEqual(cachedResults);
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('stores response in cache after nominatim call on cache miss', async () => {
    prisma.geocodeCache.findUnique.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          place_id: 123,
          display_name: 'Algiers, Algeria',
          lat: '36.7538',
          lon: '3.0588',
          type: 'city',
          importance: 0.85,
        },
      ],
    } as any);

    const out = await service.search({ q: 'Algiers', limit: 5 } as any);

    expect(out).toEqual([
      {
        placeId: '123',
        displayName: 'Algiers, Algeria',
        lat: 36.7538,
        lng: 3.0588,
        type: 'city',
        importance: 0.85,
      },
    ]);
    expect(redisClient.set).toHaveBeenCalledWith('nominatim:rate', '1', 'EX', 1, 'NX');
    expect(prisma.geocodeCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedQuery: 'algiers' },
        update: expect.objectContaining({
          results: out,
          expiresAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          normalizedQuery: 'algiers',
          results: out,
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });
});
