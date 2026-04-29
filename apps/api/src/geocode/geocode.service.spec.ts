import { GeocodeService } from './geocode.service';
import type { GeocodeProvider } from './providers/geocode-provider';

describe('GeocodeService', () => {
  let service: GeocodeService;

  const prisma = {
    geocodeCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const provider: jest.Mocked<GeocodeProvider> = {
    search: jest.fn(),
    resolve: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeocodeService(prisma as any, provider);
  });

  it('returns fresh cached results without calling the provider', async () => {
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
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('delegates to the provider and caches the result on a miss', async () => {
    prisma.geocodeCache.findUnique.mockResolvedValue(null);
    const providerResults = [
      {
        placeId: '123',
        displayName: 'Algiers, Algeria',
        lat: 36.7538,
        lng: 3.0588,
        type: 'city',
        importance: 0.85,
      },
    ];
    provider.search.mockResolvedValue(providerResults);

    const out = await service.search({ q: 'Algiers', limit: 5 } as any);

    expect(out).toEqual(providerResults);
    expect(provider.search).toHaveBeenCalledWith('algiers', 5);
    expect(prisma.geocodeCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedQuery: 'algiers' },
        update: expect.objectContaining({
          results: providerResults,
          expiresAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          normalizedQuery: 'algiers',
          results: providerResults,
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });
});
