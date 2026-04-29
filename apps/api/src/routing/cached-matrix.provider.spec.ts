import type { LatLng, RoutingMatrix, RoutingMatrixProvider } from '@contracts/index';
import { CachedMatrixProvider } from './cached-matrix.provider';

type CacheRow = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distanceM: number;
  durationS: number;
};

describe('CachedMatrixProvider', () => {
  let provider: CachedMatrixProvider;
  let store: CacheRow[];

  const upstream: jest.Mocked<RoutingMatrixProvider> = {
    getMatrix: jest.fn(),
  };

  const prisma = {
    routeMatrixCache: {
      findMany: jest.fn(async ({ where: { OR } }) => {
        return store.filter((row) =>
          OR.some(
            (clause: CacheRow) =>
              clause.fromLat === row.fromLat &&
              clause.fromLng === row.fromLng &&
              clause.toLat === row.toLat &&
              clause.toLng === row.toLng,
          ),
        );
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        const idx = store.findIndex(
          (row) =>
            row.fromLat === where.route_matrix_pair.fromLat &&
            row.fromLng === where.route_matrix_pair.fromLng &&
            row.toLat === where.route_matrix_pair.toLat &&
            row.toLng === where.route_matrix_pair.toLng,
        );
        if (idx >= 0) {
          store[idx] = { ...store[idx], ...update };
        } else {
          store.push(create as CacheRow);
        }
        return store[idx >= 0 ? idx : store.length - 1];
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    provider = new CachedMatrixProvider(prisma as never, upstream);
  });

  it('returns an N×N zero matrix for a single point', async () => {
    const result = await provider.getMatrix([{ lat: 36.7538, lng: 3.0588 }]);
    expect(result.distances).toEqual([[0]]);
    expect(result.durations).toEqual([[0]]);
    expect(upstream.getMatrix).not.toHaveBeenCalled();
  });

  it('on cold cache, calls upstream once and persists every off-diagonal pair', async () => {
    const points: LatLng[] = [
      { lat: 36.7538, lng: 3.0588 },
      { lat: 36.6910, lng: 3.2153 },
    ];
    upstream.getMatrix.mockResolvedValueOnce({
      distances: [
        [0, 14000],
        [14500, 0],
      ],
      durations: [
        [0, 1800],
        [1850, 0],
      ],
    } satisfies RoutingMatrix);

    const result = await provider.getMatrix(points);

    expect(upstream.getMatrix).toHaveBeenCalledTimes(1);
    expect(result.distances[0][1]).toBe(14000);
    expect(result.distances[1][0]).toBe(14500);
    expect(result.durations[0][1]).toBe(1800);
    expect(result.durations[1][0]).toBe(1850);
    // 2 distinct points → 2 off-diagonal pairs, each upserted once.
    expect(prisma.routeMatrixCache.upsert).toHaveBeenCalledTimes(2);
  });

  it('on warm cache, skips upstream entirely', async () => {
    store = [
      {
        fromLat: 36.7538,
        fromLng: 3.0588,
        toLat: 36.69,
        toLng: 3.2153,
        distanceM: 14000,
        durationS: 1800,
      },
      {
        fromLat: 36.69,
        fromLng: 3.2153,
        toLat: 36.7538,
        toLng: 3.0588,
        distanceM: 14500,
        durationS: 1850,
      },
    ];

    const result = await provider.getMatrix([
      { lat: 36.7538, lng: 3.0588 },
      { lat: 36.69, lng: 3.2153 },
    ]);

    expect(upstream.getMatrix).not.toHaveBeenCalled();
    expect(prisma.routeMatrixCache.upsert).not.toHaveBeenCalled();
    expect(result.distances[0][1]).toBe(14000);
    expect(result.durations[1][0]).toBe(1850);
  });

  it('rounds coordinates to 5 decimals so near-duplicates share a cache row', async () => {
    store = [
      {
        fromLat: 36.7538,
        fromLng: 3.0588,
        toLat: 36.69,
        toLng: 3.2153,
        distanceM: 14000,
        durationS: 1800,
      },
      {
        fromLat: 36.69,
        fromLng: 3.2153,
        toLat: 36.7538,
        toLng: 3.0588,
        distanceM: 14500,
        durationS: 1850,
      },
    ];

    // Same coords, just with extra noise in the 7th decimal.
    const result = await provider.getMatrix([
      { lat: 36.7538001, lng: 3.0588002 },
      { lat: 36.6900003, lng: 3.2153004 },
    ]);

    expect(upstream.getMatrix).not.toHaveBeenCalled();
    expect(result.distances[0][1]).toBe(14000);
  });
});
