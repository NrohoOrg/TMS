import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { LatLng, RoutingMatrix, RoutingMatrixProvider } from '@contracts/index';

const DEFAULT_DISTANCE_MATRIX_URL =
  'https://maps.googleapis.com/maps/api/distancematrix/json';

// Google Distance Matrix caps each request at 25 origins × 25 destinations
// = 625 elements. Smaller chunk sizes are slower but easier to budget.
const MAX_CHUNK = 25;

// Fixed departure timestamp used for traffic-aware durations — a future
// Monday at 08:00 Africa/Algiers (UTC+1, no DST). Picked once per process
// startup so cache lookups are stable. The dispatcher demo and v1
// optimization always plans for "a typical weekday morning"; per-plan
// times can be wired later.
const FIXED_DEPARTURE_TIMESTAMP = (() => {
  const now = new Date();
  const target = new Date(now);
  // Algiers is UTC+1, no DST. 08:00 local = 07:00 UTC.
  target.setUTCHours(7, 0, 0, 0);
  // Bump to the next Monday on or after today.
  const daysUntilMonday = (1 - target.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  return Math.floor(target.getTime() / 1000);
})();

type DistanceMatrixElement = {
  status: string;
  distance?: { value: number };
  duration?: { value: number };
  duration_in_traffic?: { value: number };
};

type DistanceMatrixResponse = {
  status: string;
  rows?: Array<{ elements: DistanceMatrixElement[] }>;
  error_message?: string;
};

@Injectable()
export class GoogleDistanceMatrixProvider implements RoutingMatrixProvider {
  private readonly logger = new Logger(GoogleDistanceMatrixProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async getMatrix(points: LatLng[]): Promise<RoutingMatrix> {
    const n = points.length;
    const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    if (n <= 1) {
      return { distances, durations };
    }

    const apiKey = this.requireKey();
    const url =
      this.configService.get<string>('GOOGLE_DISTANCE_MATRIX_BASE_URL') ??
      DEFAULT_DISTANCE_MATRIX_URL;

    // Chunk the N×N grid into ≤25×25 blocks. Each block is one API call.
    for (let oStart = 0; oStart < n; oStart += MAX_CHUNK) {
      const oEnd = Math.min(oStart + MAX_CHUNK, n);
      for (let dStart = 0; dStart < n; dStart += MAX_CHUNK) {
        const dEnd = Math.min(dStart + MAX_CHUNK, n);

        const origins = points
          .slice(oStart, oEnd)
          .map((p) => `${p.lat},${p.lng}`)
          .join('|');
        const destinations = points
          .slice(dStart, dEnd)
          .map((p) => `${p.lat},${p.lng}`)
          .join('|');

        const response = await axios.get<DistanceMatrixResponse>(url, {
          params: {
            origins,
            destinations,
            key: apiKey,
            mode: 'driving',
            departure_time: FIXED_DEPARTURE_TIMESTAMP,
            traffic_model: 'best_guess',
            language: 'fr',
            region: 'dz',
            units: 'metric',
          },
          timeout: 15_000,
        });

        if (response.data.status !== 'OK') {
          this.logger.warn(
            `Distance Matrix returned ${response.data.status}: ${response.data.error_message ?? '(no message)'}`,
          );
          throw new InternalServerErrorException(
            `Google Distance Matrix request failed: ${response.data.status}`,
          );
        }

        const rows = response.data.rows ?? [];
        for (let oi = 0; oi < oEnd - oStart; oi += 1) {
          const row = rows[oi]?.elements ?? [];
          for (let di = 0; di < dEnd - dStart; di += 1) {
            const element = row[di];
            const i = oStart + oi;
            const j = dStart + di;
            if (i === j) {
              continue;
            }
            if (!element || element.status !== 'OK') {
              this.logger.warn(
                `Element ${i}->${j} returned ${element?.status ?? 'MISSING'}`,
              );
              throw new InternalServerErrorException(
                `Google Distance Matrix element failed: ${element?.status ?? 'MISSING'}`,
              );
            }
            distances[i][j] = element.distance?.value ?? 0;
            durations[i][j] =
              element.duration_in_traffic?.value ?? element.duration?.value ?? 0;
          }
        }
      }
    }

    return { distances, durations };
  }

  private requireKey(): string {
    const key = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'GOOGLE_MAPS_API_KEY is not configured',
      );
    }
    return key;
  }
}
