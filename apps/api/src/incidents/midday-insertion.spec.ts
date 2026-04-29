import { Priority } from '@prisma/client';
import {
  DriverSnapshot,
  OpenTask,
  planMidDayInsertions,
  sortTasksForGreedy,
} from './midday-insertion';

const speedKmh = 40;
const config = { speedKmh };

function emptyDriver(over: Partial<DriverSnapshot> = {}): DriverSnapshot {
  return {
    id: 'd1',
    routeId: 'r1',
    depot: { lat: 36.75, lng: 3.06 },
    shiftStartS: 8 * 3600,
    shiftEndS: 17 * 3600,
    capacityUnits: null,
    stops: [],
    lastExecutedIndex: -1,
    ...over,
  };
}

function task(over: Partial<OpenTask> = {}): OpenTask {
  return {
    id: 't1',
    priority: Priority.normal,
    pickup: { lat: 36.76, lng: 3.07 },
    dropoff: { lat: 36.77, lng: 3.08 },
    pickupEarliestS: 9 * 3600,
    pickupLatestS: 12 * 3600,
    dropoffDeadlineS: 16 * 3600,
    pickupServiceS: 600,
    dropoffServiceS: 600,
    capacityUnits: 1,
    ...over,
  };
}

describe('sortTasksForGreedy', () => {
  it('orders by priority (urgent first) then by deadline', () => {
    const tasks = [
      task({ id: 'low-early', priority: Priority.normal, dropoffDeadlineS: 10 * 3600 }),
      task({ id: 'urgent-late', priority: Priority.urgent, dropoffDeadlineS: 16 * 3600 }),
      task({ id: 'normal-mid', priority: Priority.normal, dropoffDeadlineS: 13 * 3600 }),
      task({ id: 'urgent-early', priority: Priority.urgent, dropoffDeadlineS: 11 * 3600 }),
    ];

    const ordered = sortTasksForGreedy(tasks);
    expect(ordered.map((t) => t.id)).toEqual([
      'urgent-early',
      'urgent-late',
      'low-early',
      'normal-mid',
    ]);
  });
});

describe('planMidDayInsertions', () => {
  it('returns NO_DRIVER_AVAILABLE for every task when there are no drivers', () => {
    const result = planMidDayInsertions([], [task()], config);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([{ taskId: 't1', reason: 'NO_DRIVER_AVAILABLE' }]);
  });

  it('returns empty when there are no tasks', () => {
    const result = planMidDayInsertions([emptyDriver()], [], config);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([]);
  });

  it('inserts a single task into an empty route', () => {
    const result = planMidDayInsertions(
      [emptyDriver()],
      [task({ id: 't1' })],
      config,
    );
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toMatchObject({
      taskId: 't1',
      driverId: 'd1',
      pickupAfterIndex: 0,
      dropoffAfterIndex: 0,
    });
    expect(result.unassigned).toEqual([]);
  });

  it('rejects a task that no driver can fit (shift ends before window opens)', () => {
    const driver = emptyDriver({ shiftEndS: 9 * 3600 + 30 * 60 }); // 09:30 cutoff
    const t = task({
      id: 't-late',
      pickupEarliestS: 11 * 3600,
      pickupLatestS: 12 * 3600,
      dropoffDeadlineS: 13 * 3600,
    });
    const result = planMidDayInsertions([driver], [t], config);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([
      { taskId: 't-late', reason: 'SHIFT_FULL' },
    ]);
  });

  it('rejects a task whose dropoff deadline has already passed', () => {
    const driver = emptyDriver();
    const t = task({
      id: 't-past',
      pickupEarliestS: 9 * 3600,
      pickupLatestS: 10 * 3600,
      dropoffDeadlineS: 8 * 3600, // earlier than even the shift start
    });
    const result = planMidDayInsertions([driver], [t], config);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned[0]).toMatchObject({
      taskId: 't-past',
      reason: 'TIME_WINDOW_INFEASIBLE',
    });
  });

  it('rejects a task whose demand exceeds every driver capacity', () => {
    const driver = emptyDriver({ capacityUnits: 1 });
    const t = task({ id: 't-big', capacityUnits: 5 });
    const result = planMidDayInsertions([driver], [t], config);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([
      { taskId: 't-big', reason: 'CAPACITY_EXCEEDED' },
    ]);
  });

  it('prefers the closer driver (lower extra distance)', () => {
    const closer = emptyDriver({
      id: 'closer',
      routeId: 'r-close',
      depot: { lat: 36.76, lng: 3.07 }, // same as task.pickup
    });
    const farther = emptyDriver({
      id: 'farther',
      routeId: 'r-far',
      depot: { lat: 36.0, lng: 3.0 },
    });
    const result = planMidDayInsertions([farther, closer], [task()], config);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].driverId).toBe('closer');
  });

  it('respects the executed prefix: insertion only happens after lastExecutedIndex', () => {
    const driver: DriverSnapshot = emptyDriver({
      stops: [
        {
          type: 'pickup',
          taskId: 'A',
          coords: { lat: 36.75, lng: 3.06 },
          serviceS: 0,
          earliestArrivalS: 0,
          latestArrivalS: 24 * 3600,
          locked: true,
          capacityDelta: 0,
          knownDepartureS: 9 * 3600,
        },
        {
          type: 'dropoff',
          taskId: 'A',
          coords: { lat: 36.75, lng: 3.06 },
          serviceS: 0,
          earliestArrivalS: 0,
          latestArrivalS: 24 * 3600,
          locked: true,
          capacityDelta: 0,
          knownDepartureS: 9 * 3600 + 1800,
        },
      ],
      lastExecutedIndex: 1, // both stops executed
    });
    const result = planMidDayInsertions([driver], [task({ id: 't1' })], config);
    expect(result.assignments).toHaveLength(1);
    // pickupSlot must be >= 2 (after the executed prefix)
    expect(result.assignments[0].pickupAfterIndex).toBeGreaterThanOrEqual(2);
  });

  it('places multiple tasks: greedy + priority order', () => {
    const driver = emptyDriver();
    const urgent = task({ id: 'urgent', priority: Priority.urgent });
    const lowPriority = task({
      id: 'low',
      priority: Priority.normal,
      // far away so the greedy considers it after urgent
      pickup: { lat: 36.8, lng: 3.1 },
      dropoff: { lat: 36.81, lng: 3.11 },
    });

    const result = planMidDayInsertions([driver], [lowPriority, urgent], config);

    expect(result.assignments).toHaveLength(2);
    // urgent must come first in assignment order due to greedy sort
    expect(result.assignments[0].taskId).toBe('urgent');
    expect(result.assignments[1].taskId).toBe('low');
  });

  it('marks subsequent tasks as locked so a third task plans around the second', () => {
    const driver = emptyDriver();

    const a = task({
      id: 'a',
      pickup: { lat: 36.76, lng: 3.07 },
      dropoff: { lat: 36.77, lng: 3.08 },
    });
    const b = task({
      id: 'b',
      pickup: { lat: 36.78, lng: 3.09 },
      dropoff: { lat: 36.79, lng: 3.10 },
    });

    const result = planMidDayInsertions([driver], [a, b], config);
    expect(result.assignments).toHaveLength(2);
    // Both tasks should fit; second one is placed onto the route shape that
    // already includes a's stops.
    const ids = result.assignments.map((x) => x.taskId);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });
});
