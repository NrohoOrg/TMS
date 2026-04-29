import { StopStatus, TaskStatus } from '@prisma/client';

/**
 * v1.1 R1.2 — Frozen plan invariant.
 *
 * Pure classifier functions (no Prisma calls). Callers pass the loaded data.
 * Every later v1.1 requirement that needs to ask "is this stop/task/route
 * frozen?" should import from here so the rules stay consistent.
 *
 * Definitions (mapped onto the v1 schema):
 * - Stop is "frozen" when its status is anything other than `pending`
 *   (i.e. the driver has at least arrived, or the stop was skipped/done).
 * - Task is "in progress" when at least one of its stops is non-pending
 *   AND not all stops are done.
 * - Task is "completed" when all of its stops are `done`.
 * - Driver is "available" today when `active` AND today's availability row
 *   either doesn't exist or has `available !== false`.
 */

export type StopWithStatus = { status: StopStatus };

/**
 * Some stops carry a richer state needed by the route recalculator:
 * `actualArrivalS` distinguishes "the driver arrived but skipped" (recorded
 * field execution) from "the dispatcher cancelled this stop before it
 * happened" (no field execution). The two look identical at the `status`
 * level (`skipped`) but mean different things for ETA recomputation.
 */
export type StopWithActuals = StopWithStatus & {
  actualArrivalS: number | null;
};

export type TaskExecutionState =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export function isStopFrozen(stop: StopWithStatus): boolean {
  return stop.status !== StopStatus.pending;
}

/**
 * v1.1 R1.4 — a stop is "dispatcher-cancelled" when its status is
 * `skipped` AND it has no `actualArrivalS` (the field never recorded a
 * driver visit). This is the result of cancelling an `assigned` task:
 * the stops stay on the route as `skipped` for audit purposes but the
 * driver never actually went there. The recalc treats these stops as
 * absent for trajectory and ETA purposes.
 */
export function isStopDispatcherCancelled(stop: StopWithActuals): boolean {
  return stop.status === StopStatus.skipped && stop.actualArrivalS === null;
}

/**
 * v1.1 R1.4 — a stop is "executed" when its status is non-pending AND
 * the field actually recorded a driver visit. `done` and `arrived`
 * always qualify; `skipped` qualifies only if `actualArrivalS` is set.
 *
 * Executed stops anchor the recalc: their stored times are truth and
 * the next segment starts from their coordinates. Frozen-but-not-
 * executed stops (dispatcher-cancelled) are bypassed by the recalc.
 */
export function isStopExecuted(stop: StopWithActuals): boolean {
  return isStopFrozen(stop) && !isStopDispatcherCancelled(stop);
}

export function getTaskExecutionState(
  task: { status: TaskStatus },
  stops: StopWithStatus[],
): TaskExecutionState {
  if (task.status === TaskStatus.cancelled) return 'cancelled';

  if (stops.length === 0) {
    return task.status === TaskStatus.assigned ? 'assigned' : 'pending';
  }

  const allDone = stops.every((s) => s.status === StopStatus.done);
  if (allDone) return 'completed';

  const anyFrozen = stops.some((s) => isStopFrozen(s));
  if (anyFrozen) return 'in_progress';

  return task.status === TaskStatus.assigned ? 'assigned' : 'pending';
}

export function isTaskInProgress(state: TaskExecutionState): boolean {
  return state === 'in_progress';
}

export function isTaskCompleted(state: TaskExecutionState): boolean {
  return state === 'completed';
}

export function isTaskMutable(state: TaskExecutionState): boolean {
  // Mutable means: dispatcher can still edit fields like address, time
  // window, priority, service times. Once execution starts (in_progress)
  // or the task is finished/cancelled, the dispatcher must not mutate it.
  return state === 'pending' || state === 'assigned';
}

export type DriverActiveLike = { active: boolean };
export type AvailabilityLike = { available: boolean } | null | undefined;

export function isDriverAvailable(
  driver: DriverActiveLike,
  availabilityForDate?: AvailabilityLike,
): boolean {
  if (!driver.active) return false;
  if (availabilityForDate && availabilityForDate.available === false) return false;
  return true;
}

/**
 * Index of the LAST frozen stop on a route, ordered by sequence ascending.
 * Frozen = non-pending (regardless of whether the driver actually visited).
 * Used by R1.2 mutation guards.
 *
 * Returns -1 if no stop is frozen.
 */
export function findLastFrozenStopIndex(
  stopsOrderedBySequence: StopWithStatus[],
): number {
  for (let i = stopsOrderedBySequence.length - 1; i >= 0; i -= 1) {
    if (isStopFrozen(stopsOrderedBySequence[i])) return i;
  }
  return -1;
}

/**
 * Index of the FIRST frozen stop on a route. -1 if none.
 * Useful for "this route has at least one started stop" checks.
 */
export function findFirstFrozenStopIndex(
  stopsOrderedBySequence: StopWithStatus[],
): number {
  for (let i = 0; i < stopsOrderedBySequence.length; i += 1) {
    if (isStopFrozen(stopsOrderedBySequence[i])) return i;
  }
  return -1;
}

/**
 * v1.1 R1.4 — Index of the LAST executed stop on a route.
 * Used by `recalculateRoute` to anchor downstream ETA recomputation.
 * Excludes dispatcher-cancelled (`skipped` with no `actualArrivalS`)
 * stops because they never happened in the field.
 *
 * Returns -1 if no stop has been executed.
 */
export function findLastExecutedStopIndex(
  stopsOrderedBySequence: StopWithActuals[],
): number {
  for (let i = stopsOrderedBySequence.length - 1; i >= 0; i -= 1) {
    if (isStopExecuted(stopsOrderedBySequence[i])) return i;
  }
  return -1;
}

/** v1.1 R1.4 — first executed stop index, -1 if none. */
export function findFirstExecutedStopIndex(
  stopsOrderedBySequence: StopWithActuals[],
): number {
  for (let i = 0; i < stopsOrderedBySequence.length; i += 1) {
    if (isStopExecuted(stopsOrderedBySequence[i])) return i;
  }
  return -1;
}

export function routeHasStartedStops(
  stopsOrderedBySequence: StopWithStatus[],
): boolean {
  return findFirstFrozenStopIndex(stopsOrderedBySequence) >= 0;
}
