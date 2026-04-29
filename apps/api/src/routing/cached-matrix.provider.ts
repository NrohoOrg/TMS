import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LatLng, RoutingMatrix, RoutingMatrixProvider } from '@contracts/index';
import { PrismaService } from '../prisma/prisma.service';
import { UPSTREAM_MATRIX_PROVIDER } from './routing.constants';

/**
 * Wraps any upstream RoutingMatrixProvider with a Postgres-backed,
 * never-expiring cache keyed by the (from, to) coordinate pair.
 *
 * Coordinates are rounded to 5 decimals (~1 m) at lookup and insert time
 * so near-duplicate addresses share a row.
 *
 * On a request for an N×N matrix, every pair already in cache is read
 * from the DB and only the missing pairs are forwarded to the upstream
 * provider, by way of a compact sub-matrix query.
 */
@Injectable()
export class CachedMatrixProvider implements RoutingMatrixProvider {
  private readonly logger = new Logger(CachedMatrixProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(UPSTREAM_MATRIX_PROVIDER)
    private readonly upstream: RoutingMatrixProvider,
  ) {}

  async getMatrix(points: LatLng[]): Promise<RoutingMatrix> {
    const n = points.length;
    const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    if (n <= 1) {
      return { distances, durations };
    }

    const rounded = points.map((p) => ({ lat: round5(p.lat), lng: round5(p.lng) }));

    // Look up every (from, to) pair already cached. We use a compact OR
    // over distinct points to avoid a quadratic-sized WHERE clause.
    const distinctPoints = dedupePoints(rounded);
    const cachedRows = await this.prisma.routeMatrixCache.findMany({
      where: {
        OR: distinctPoints.flatMap((from) =>
          distinctPoints.map((to) => ({
            fromLat: from.lat,
            fromLng: from.lng,
            toLat: to.lat,
            toLng: to.lng,
          })),
        ),
      },
      select: {
        fromLat: true,
        fromLng: true,
        toLat: true,
        toLng: true,
        distanceM: true,
        durationS: true,
      },
    });

    const cacheByKey = new Map<string, { distanceM: number; durationS: number }>();
    for (const row of cachedRows) {
      cacheByKey.set(pairKey(row.fromLat, row.fromLng, row.toLat, row.toLng), {
        distanceM: row.distanceM,
        durationS: row.durationS,
      });
    }

    // Identify which distinct (from, to) pairs are missing.
    const missingPairs: Array<{ from: LatLng; to: LatLng }> = [];
    const missingPairKeys = new Set<string>();
    for (const from of distinctPoints) {
      for (const to of distinctPoints) {
        if (from.lat === to.lat && from.lng === to.lng) continue;
        const key = pairKey(from.lat, from.lng, to.lat, to.lng);
        if (!cacheByKey.has(key) && !missingPairKeys.has(key)) {
          missingPairKeys.add(key);
          missingPairs.push({ from, to });
        }
      }
    }

    if (missingPairs.length > 0) {
      this.logger.log(
        `Routing cache miss: ${missingPairs.length}/${distinctPoints.length ** 2 - distinctPoints.length} pairs — calling upstream`,
      );
      await this.fillCacheFromUpstream(distinctPoints);

      // Re-read the just-inserted pairs.
      const refreshed = await this.prisma.routeMatrixCache.findMany({
        where: {
          OR: missingPairs.map((p) => ({
            fromLat: p.from.lat,
            fromLng: p.from.lng,
            toLat: p.to.lat,
            toLng: p.to.lng,
          })),
        },
        select: {
          fromLat: true,
          fromLng: true,
          toLat: true,
          toLng: true,
          distanceM: true,
          durationS: true,
        },
      });
      for (const row of refreshed) {
        cacheByKey.set(pairKey(row.fromLat, row.fromLng, row.toLat, row.toLng), {
          distanceM: row.distanceM,
          durationS: row.durationS,
        });
      }
    }

    // Materialise the full N×N matrix from the cache map.
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const from = rounded[i];
        const to = rounded[j];
        const entry = cacheByKey.get(pairKey(from.lat, from.lng, to.lat, to.lng));
        if (!entry) {
          throw new Error(
            `Routing cache miss after upstream fill — pair ${from.lat},${from.lng}→${to.lat},${to.lng} still absent`,
          );
        }
        distances[i][j] = entry.distanceM;
        durations[i][j] = entry.durationS;
      }
    }

    return { distances, durations };
  }

  /** Calls the upstream provider for the full N×N grid of distinct points
   *  and upserts every (i,j) pair into the cache. */
  private async fillCacheFromUpstream(points: LatLng[]): Promise<void> {
    const matrix = await this.upstream.getMatrix(points);
    const writes: Promise<unknown>[] = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = 0; j < points.length; j += 1) {
        if (i === j) continue;
        const from = points[i];
        const to = points[j];
        writes.push(
          this.prisma.routeMatrixCache.upsert({
            where: {
              route_matrix_pair: {
                fromLat: from.lat,
                fromLng: from.lng,
                toLat: to.lat,
                toLng: to.lng,
              },
            },
            update: {
              distanceM: matrix.distances[i][j],
              durationS: matrix.durations[i][j],
              computedAt: new Date(),
            },
            create: {
              fromLat: from.lat,
              fromLng: from.lng,
              toLat: to.lat,
              toLng: to.lng,
              distanceM: matrix.distances[i][j],
              durationS: matrix.durations[i][j],
            },
          }),
        );
      }
    }
    await Promise.all(writes);
  }
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function pairKey(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return `${fromLat},${fromLng}|${toLat},${toLng}`;
}

function dedupePoints(points: LatLng[]): LatLng[] {
  const seen = new Set<string>();
  const out: LatLng[] = [];
  for (const p of points) {
    const key = `${p.lat},${p.lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
