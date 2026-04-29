import { Injectable } from '@nestjs/common';
import type { LatLng, RoutingMatrix, RoutingMatrixProvider } from '@contracts/index';

const EARTH_RADIUS_M = 6371000;
const ASSUMED_SPEED_KMH = 50;

@Injectable()
export class HaversineMatrixProvider implements RoutingMatrixProvider {
  async getMatrix(points: LatLng[]): Promise<RoutingMatrix> {
    const distances = points.map((fromPoint) =>
      points.map((toPoint) => {
        if (fromPoint === toPoint) {
          return 0;
        }

        return Math.round(
          this.calculateDistanceMeters(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng),
        );
      }),
    );

    const speedMetersPerSecond = (ASSUMED_SPEED_KMH * 1000) / 3600;
    const durations = distances.map((row) =>
      row.map((distanceMeters) =>
        distanceMeters === 0 ? 0 : Math.max(1, Math.round(distanceMeters / speedMetersPerSecond)),
      ),
    );

    return { durations, distances };
  }

  private calculateDistanceMeters(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): number {
    const fromLatRadians = this.toRadians(fromLat);
    const toLatRadians = this.toRadians(toLat);
    const deltaLat = this.toRadians(toLat - fromLat);
    const deltaLng = this.toRadians(toLng - fromLng);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(fromLatRadians) * Math.cos(toLatRadians) * Math.sin(deltaLng / 2) ** 2;

    return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
