/**
 * v1.1 R1.5 — Mid-day greedy insertion (Path A).
 *
 * Pure functions. No Prisma, no I/O. Given a snapshot of the current state
 * (drivers + their existing route stops + the pool of unassigned tasks),
 * return a plan: which task goes to which driver and at what sequence
 * positions, with the remaining tasks classified by why they couldn't fit.
 *
 * Existing stops are NEVER moved or reordered. Frozen / executed prefixes
 * are respected (insertion can only happen after the last executed stop).
 * Already-assigned pending stops (locked) keep their order; we only insert
 * BETWEEN them.
 */

import { Priority } from '@prisma/client';

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  normal: 1,
};

const REASON_NO_DRIVER_AVAILABLE = 'NO_DRIVER_AVAILABLE';
const REASON_TIME_WINDOW_INFEASIBLE = 'TIME_WINDOW_INFEASIBLE';
const REASON_CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED';
const REASON_SHIFT_FULL = 'SHIFT_FULL';

export type LatLng = { lat: number; lng: number };

export interface DriverSnapshot {
  id: string;
  routeId: string | null;          // null if the driver has no route on the published plan
  depot: LatLng;
  shiftStartS: number;             // seconds since midnight
  shiftEndS: number;               // seconds since midnight (after applying override)
  capacityUnits: number | null;
  /** Stops already on this driver's route, ordered by sequence ASC. */
  stops: ExistingStop[];
  /** Index (in stops[]) of the LAST executed stop, or -1 if none. */
  lastExecutedIndex: number;
}

export interface ExistingStop {
  type: 'pickup' | 'dropoff';
  taskId: string;
  coords: LatLng;
  serviceS: number;
  /** Hard time-window upper bound on arrival (lock) — task's pickup latest or dropoff deadline. */
  latestArrivalS: number;
  /** Pickup window earliest, only meaningful for pickup stops; dropoff has no earliest. */
  earliestArrivalS: number;
  /** True if this stop is fully locked (executed or assigned-pending). */
  locked: boolean;
  capacityDelta: number;           // +q at pickup, -q at dropoff
  /** When the existing stop is part of an executed prefix, its known departure time. */
  knownDepartureS: number | null;
}

export interface OpenTask {
  id: string;
  priority: Priority;
  pickup: LatLng;
  dropoff: LatLng;
  pickupEarliestS: number;
  pickupLatestS: number;
  dropoffDeadlineS: number;
  pickupServiceS: number;
  dropoffServiceS: number;
  capacityUnits: number;
}

export interface InsertionPlan {
  taskId: string;
  driverId: string;
  routeId: string;
  pickupAfterIndex: number;        // 0-based; how many existing stops precede the new pickup
  dropoffAfterIndex: number;       // counted in the post-pickup-insertion route
  extraDistanceM: number;
}

export interface MidDayResult {
  assignments: InsertionPlan[];
  unassigned: Array<{ taskId: string; reason: string }>;
}

export interface InsertionConfig {
  speedKmh: number;
}

/**
 * Sort tasks for the greedy pass: urgent first, then earliest deadline.
 * The greedy pass is order-sensitive; this is the order most likely to
 * accept high-priority tasks.
 */
export function sortTasksForGreedy(tasks: OpenTask[]): OpenTask[] {
  return [...tasks].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return a.dropoffDeadlineS - b.dropoffDeadlineS;
  });
}

export function planMidDayInsertions(
  driversArg: DriverSnapshot[],
  tasksArg: OpenTask[],
  config: InsertionConfig,
): MidDayResult {
  const drivers = driversArg.map(cloneDriver);
  const tasks = sortTasksForGreedy(tasksArg);

  if (drivers.length === 0) {
    return {
      assignments: [],
      unassigned: tasks.map((t) => ({ taskId: t.id, reason: REASON_NO_DRIVER_AVAILABLE })),
    };
  }

  const assignments: InsertionPlan[] = [];
  const unassigned: MidDayResult['unassigned'] = [];

  for (const task of tasks) {
    let best: { driverIndex: number; insertion: TrialInsertion } | null = null;
    let perDriverFailureReasons: string[] = [];

    for (let di = 0; di < drivers.length; di += 1) {
      const driver = drivers[di];
      const trial = findBestInsertionForDriver(driver, task, config);
      if (trial.feasible) {
        if (!best || trial.extraDistanceM < best.insertion.extraDistanceM) {
          best = { driverIndex: di, insertion: trial };
        }
      } else {
        perDriverFailureReasons.push(trial.reason);
      }
    }

    if (best) {
      const driver = drivers[best.driverIndex];
      applyInsertionInPlace(driver, task, best.insertion);
      if (driver.routeId === null) {
        // Should never happen for an eligible driver, but be defensive.
        unassigned.push({ taskId: task.id, reason: REASON_NO_DRIVER_AVAILABLE });
        continue;
      }
      assignments.push({
        taskId: task.id,
        driverId: driver.id,
        routeId: driver.routeId,
        pickupAfterIndex: best.insertion.pickupSlot,
        dropoffAfterIndex: best.insertion.dropoffSlot,
        extraDistanceM: best.insertion.extraDistanceM,
      });
    } else {
      unassigned.push({
        taskId: task.id,
        reason: pickWorstReason(perDriverFailureReasons),
      });
    }
  }

  return { assignments, unassigned };
}

/* ─────────────── internal ─────────────── */

interface TrialInsertion {
  feasible: boolean;
  reason: string;                  // when feasible=false
  extraDistanceM: number;
  pickupSlot: number;              // slot index in driver.stops where pickup is inserted
  dropoffSlot: number;             // slot index AFTER the (already-inserted) pickup
}

const INFEASIBLE: TrialInsertion = {
  feasible: false,
  reason: REASON_TIME_WINDOW_INFEASIBLE,
  extraDistanceM: Infinity,
  pickupSlot: -1,
  dropoffSlot: -1,
};

function findBestInsertionForDriver(
  driver: DriverSnapshot,
  task: OpenTask,
  config: InsertionConfig,
): TrialInsertion {
  // Capacity precheck: if the driver has a hard capacity less than the
  // task's demand, no insertion can ever fit.
  if (
    driver.capacityUnits !== null &&
    task.capacityUnits > driver.capacityUnits
  ) {
    return { ...INFEASIBLE, reason: REASON_CAPACITY_EXCEEDED };
  }

  const N = driver.stops.length;
  const minSlot = driver.lastExecutedIndex + 1;
  let best: TrialInsertion = INFEASIBLE;
  const reasons: string[] = [];

  for (let i = minSlot; i <= N; i += 1) {
    for (let j = i; j <= N; j += 1) {
      const trial = simulateInsertion(driver, task, i, j, config);
      if (trial.feasible) {
        if (trial.extraDistanceM < best.extraDistanceM) {
          best = trial;
        }
      } else {
        reasons.push(trial.reason);
      }
    }
  }

  if (best.feasible) return best;
  return { ...INFEASIBLE, reason: pickWorstReason(reasons) };
}

/**
 * Try inserting the task's pickup at slot `i` and dropoff at slot `j` in
 * driver.stops (i <= j). Simulate the resulting timeline; check every
 * window, deadline, shift bound, and capacity along the way.
 */
function simulateInsertion(
  driver: DriverSnapshot,
  task: OpenTask,
  i: number,
  j: number,
  config: InsertionConfig,
): TrialInsertion {
  const speedMps = (config.speedKmh * 1000) / 3600;
  const N = driver.stops.length;

  // Build the trial sequence of (existingIdx | 'pickup' | 'dropoff') labels.
  // Existing indices in [0, N), labels for the two new stops.
  type Step = { kind: 'existing'; existingIdx: number } | { kind: 'pickup' } | { kind: 'dropoff' };
  const steps: Step[] = [];
  for (let k = 0; k < i; k += 1) steps.push({ kind: 'existing', existingIdx: k });
  steps.push({ kind: 'pickup' });
  for (let k = i; k < j; k += 1) steps.push({ kind: 'existing', existingIdx: k });
  steps.push({ kind: 'dropoff' });
  for (let k = j; k < N; k += 1) steps.push({ kind: 'existing', existingIdx: k });

  // Anchor: depot if no executed prefix, else last executed stop's coords/time.
  let prevLat: number;
  let prevLng: number;
  let cursorS: number;
  let originalDistanceM = 0; // for "extraDistance" calc we sum trial distance and subtract original
  const lastExec = driver.lastExecutedIndex;

  if (lastExec >= 0) {
    const anchor = driver.stops[lastExec];
    prevLat = anchor.coords.lat;
    prevLng = anchor.coords.lng;
    cursorS = anchor.knownDepartureS ?? 0;
  } else {
    prevLat = driver.depot.lat;
    prevLng = driver.depot.lng;
    cursorS = driver.shiftStartS;
  }

  // Track running load (for capacity constraint, only meaningful if driver has capacity)
  // The current load at the anchor: sum of capacity deltas of executed pickups
  // minus deltas of executed dropoffs. For simplicity we only check post-anchor;
  // pre-anchor load is implicit in driver.stops[lastExec] state.
  let currentLoad = 0;
  for (let k = 0; k <= lastExec; k += 1) {
    currentLoad += driver.stops[k].capacityDelta;
  }

  let trialDistanceM = 0;

  for (let s = 0; s < steps.length; s += 1) {
    const step = steps[s];
    const stepIsPreAnchor =
      step.kind === 'existing' && step.existingIdx <= lastExec;

    if (stepIsPreAnchor) {
      // Existing executed prefix — skip; trajectory is already accounted for.
      continue;
    }

    // Find this step's coords, service time, latest-arrival, earliest-arrival,
    // capacityDelta.
    let lat: number;
    let lng: number;
    let serviceS: number;
    let earliestArrivalS = 0;
    let latestArrivalS = Number.POSITIVE_INFINITY;
    let delta = 0;

    if (step.kind === 'existing') {
      const existing = driver.stops[step.existingIdx];
      lat = existing.coords.lat;
      lng = existing.coords.lng;
      serviceS = existing.serviceS;
      earliestArrivalS = existing.earliestArrivalS;
      latestArrivalS = existing.latestArrivalS;
      delta = existing.capacityDelta;
    } else if (step.kind === 'pickup') {
      lat = task.pickup.lat;
      lng = task.pickup.lng;
      serviceS = task.pickupServiceS;
      earliestArrivalS = task.pickupEarliestS;
      latestArrivalS = task.pickupLatestS;
      delta = task.capacityUnits;
    } else {
      lat = task.dropoff.lat;
      lng = task.dropoff.lng;
      serviceS = task.dropoffServiceS;
      earliestArrivalS = 0;
      latestArrivalS = task.dropoffDeadlineS;
      delta = -task.capacityUnits;
    }

    const segM = haversineMeters(prevLat, prevLng, lat, lng);
    const segS = segM > 0 ? Math.max(1, Math.round(segM / speedMps)) : 0;
    trialDistanceM += segM;

    let arrivalS = cursorS + segS;
    if (arrivalS < earliestArrivalS) {
      arrivalS = earliestArrivalS; // wait until window opens
    }
    if (arrivalS > latestArrivalS) {
      return {
        feasible: false,
        reason: REASON_TIME_WINDOW_INFEASIBLE,
        extraDistanceM: Infinity,
        pickupSlot: i,
        dropoffSlot: j,
      };
    }

    const departureS = arrivalS + serviceS;
    if (departureS > driver.shiftEndS) {
      return {
        feasible: false,
        reason: REASON_SHIFT_FULL,
        extraDistanceM: Infinity,
        pickupSlot: i,
        dropoffSlot: j,
      };
    }

    currentLoad += delta;
    if (driver.capacityUnits !== null && currentLoad > driver.capacityUnits) {
      return {
        feasible: false,
        reason: REASON_CAPACITY_EXCEEDED,
        extraDistanceM: Infinity,
        pickupSlot: i,
        dropoffSlot: j,
      };
    }

    cursorS = departureS;
    prevLat = lat;
    prevLng = lng;
  }

  // Compute original distance (the same prefix-walk without the two inserted stops)
  let origPrevLat: number;
  let origPrevLng: number;
  if (lastExec >= 0) {
    origPrevLat = driver.stops[lastExec].coords.lat;
    origPrevLng = driver.stops[lastExec].coords.lng;
  } else {
    origPrevLat = driver.depot.lat;
    origPrevLng = driver.depot.lng;
  }
  for (let k = lastExec + 1; k < N; k += 1) {
    const stop = driver.stops[k];
    originalDistanceM += haversineMeters(
      origPrevLat,
      origPrevLng,
      stop.coords.lat,
      stop.coords.lng,
    );
    origPrevLat = stop.coords.lat;
    origPrevLng = stop.coords.lng;
  }

  return {
    feasible: true,
    reason: '',
    extraDistanceM: trialDistanceM - originalDistanceM,
    pickupSlot: i,
    dropoffSlot: j,
  };
}

function applyInsertionInPlace(
  driver: DriverSnapshot,
  task: OpenTask,
  insertion: TrialInsertion,
): void {
  // Update the working snapshot's stops list so subsequent tasks "see" this task
  // as already-inserted. We mark new stops as locked=true (they're now committed
  // for this insertion pass).
  const pickupStop: ExistingStop = {
    type: 'pickup',
    taskId: task.id,
    coords: { ...task.pickup },
    serviceS: task.pickupServiceS,
    earliestArrivalS: task.pickupEarliestS,
    latestArrivalS: task.pickupLatestS,
    locked: true,
    capacityDelta: task.capacityUnits,
    knownDepartureS: null,
  };
  const dropoffStop: ExistingStop = {
    type: 'dropoff',
    taskId: task.id,
    coords: { ...task.dropoff },
    serviceS: task.dropoffServiceS,
    earliestArrivalS: 0,
    latestArrivalS: task.dropoffDeadlineS,
    locked: true,
    capacityDelta: -task.capacityUnits,
    knownDepartureS: null,
  };

  // Insert pickup at insertion.pickupSlot, dropoff at insertion.dropoffSlot
  // (counted in the original list). After inserting pickup, all original
  // indices >= pickupSlot shift by +1; the dropoff goes at dropoffSlot+1
  // in the new array (because pickup pushed everything after it).
  driver.stops.splice(insertion.pickupSlot, 0, pickupStop);
  // After pickup splice, the original index `dropoffSlot` is now at `dropoffSlot + 1`.
  driver.stops.splice(insertion.dropoffSlot + 1, 0, dropoffStop);
}

function cloneDriver(d: DriverSnapshot): DriverSnapshot {
  return {
    ...d,
    stops: d.stops.map((s) => ({ ...s, coords: { ...s.coords } })),
  };
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

function pickWorstReason(reasons: string[]): string {
  if (reasons.length === 0) return REASON_NO_DRIVER_AVAILABLE;
  // Prefer the most specific reason in the order: capacity > time window > shift.
  if (reasons.includes(REASON_CAPACITY_EXCEEDED)) return REASON_CAPACITY_EXCEEDED;
  if (reasons.includes(REASON_TIME_WINDOW_INFEASIBLE)) return REASON_TIME_WINDOW_INFEASIBLE;
  if (reasons.includes(REASON_SHIFT_FULL)) return REASON_SHIFT_FULL;
  return reasons[0];
}
