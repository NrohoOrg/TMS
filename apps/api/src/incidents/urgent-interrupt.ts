/**
 * v1.1 R1.6 — Urgent interrupt mode (bypasses solver).
 *
 * Pure functions for the two non-trivial pieces:
 *   - closest-driver selection by Haversine distance from each driver's
 *     "current position" (last executed stop, or depot) to the urgent
 *     task's pickup;
 *   - violation detection on the recomputed downstream timeline.
 */

export type LatLng = { lat: number; lng: number };

export interface DriverPositionInput {
  id: string;
  name: string;
  depot: LatLng;
  /** Coords of the driver's last executed stop, if any. */
  lastExecutedCoords: LatLng | null;
}

export interface ClosestDriverPick {
  driverId: string;
  driverName: string;
  distanceM: number;
  fromDepot: boolean;            // true if no executed stop exists yet
}

export function pickClosestDriver(
  drivers: DriverPositionInput[],
  urgentPickup: LatLng,
): ClosestDriverPick | null {
  if (drivers.length === 0) return null;
  let best: ClosestDriverPick | null = null;
  for (const d of drivers) {
    const from = d.lastExecutedCoords ?? d.depot;
    const distanceM = haversineMeters(from.lat, from.lng, urgentPickup.lat, urgentPickup.lng);
    if (best === null || distanceM < best.distanceM) {
      best = {
        driverId: d.id,
        driverName: d.name,
        distanceM,
        fromDepot: d.lastExecutedCoords === null,
      };
    }
  }
  return best;
}

export interface DownstreamStopForCheck {
  stopId: string;
  taskId: string;
  type: 'pickup' | 'dropoff';
  taskTitle: string;
  recomputedEtaS: number;
  /** For pickup: the task's pickupWindowEnd. For dropoff: pickupWindowStart + dropoffWithinHours. */
  latestArrivalS: number;
  /** Pickup window start; for non-pickup stops, 0. */
  earliestArrivalS: number;
}

export interface Violation {
  stopId: string;
  taskId: string;
  type: 'pickup' | 'dropoff' | 'shift';
  taskTitle: string | null;
  newEtaS: number;
  latestAllowedS: number;
  delaySeconds: number;
}

export function detectViolations(
  stops: DownstreamStopForCheck[],
  shiftEndS: number,
  routeEndEtaS: number,
): Violation[] {
  const violations: Violation[] = [];
  for (const stop of stops) {
    if (stop.recomputedEtaS > stop.latestArrivalS) {
      violations.push({
        stopId: stop.stopId,
        taskId: stop.taskId,
        type: stop.type,
        taskTitle: stop.taskTitle,
        newEtaS: stop.recomputedEtaS,
        latestAllowedS: stop.latestArrivalS,
        delaySeconds: stop.recomputedEtaS - stop.latestArrivalS,
      });
    }
  }
  if (routeEndEtaS > shiftEndS) {
    violations.push({
      stopId: '',
      taskId: '',
      type: 'shift',
      taskTitle: null,
      newEtaS: routeEndEtaS,
      latestAllowedS: shiftEndS,
      delaySeconds: routeEndEtaS - shiftEndS,
    });
  }
  return violations;
}

function haversineMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
