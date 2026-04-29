import { StopStatus, TaskStatus } from '@prisma/client';
import {
  findFirstExecutedStopIndex,
  findFirstFrozenStopIndex,
  findLastExecutedStopIndex,
  findLastFrozenStopIndex,
  getTaskExecutionState,
  isDriverAvailable,
  isStopDispatcherCancelled,
  isStopExecuted,
  isStopFrozen,
  isTaskCompleted,
  isTaskInProgress,
  isTaskMutable,
  routeHasStartedStops,
} from './frozen-plan.helpers';

describe('frozen-plan.helpers', () => {
  describe('isStopFrozen', () => {
    it('returns false for pending stops', () => {
      expect(isStopFrozen({ status: StopStatus.pending })).toBe(false);
    });

    it.each([StopStatus.arrived, StopStatus.done, StopStatus.skipped])(
      'returns true for %s stops',
      (status) => {
        expect(isStopFrozen({ status })).toBe(true);
      },
    );
  });

  describe('getTaskExecutionState', () => {
    it('returns cancelled regardless of stops', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.cancelled }, [
          { status: StopStatus.done },
          { status: StopStatus.done },
        ]),
      ).toBe('cancelled');
    });

    it('returns pending when no stops and Task.status is pending', () => {
      expect(getTaskExecutionState({ status: TaskStatus.pending }, [])).toBe('pending');
    });

    it('returns assigned when no stops and Task.status is assigned', () => {
      expect(getTaskExecutionState({ status: TaskStatus.assigned }, [])).toBe('assigned');
    });

    it('returns assigned when all stops are pending', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.assigned }, [
          { status: StopStatus.pending },
          { status: StopStatus.pending },
        ]),
      ).toBe('assigned');
    });

    it('returns in_progress when one stop is arrived', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.assigned }, [
          { status: StopStatus.arrived },
          { status: StopStatus.pending },
        ]),
      ).toBe('in_progress');
    });

    it('returns in_progress when pickup is done but dropoff is pending', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.assigned }, [
          { status: StopStatus.done },
          { status: StopStatus.pending },
        ]),
      ).toBe('in_progress');
    });

    it('returns in_progress when a stop is skipped but not all done', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.assigned }, [
          { status: StopStatus.skipped },
          { status: StopStatus.pending },
        ]),
      ).toBe('in_progress');
    });

    it('returns completed when every stop is done', () => {
      expect(
        getTaskExecutionState({ status: TaskStatus.assigned }, [
          { status: StopStatus.done },
          { status: StopStatus.done },
        ]),
      ).toBe('completed');
    });
  });

  describe('isTaskInProgress / isTaskCompleted / isTaskMutable', () => {
    it('classifies states correctly', () => {
      expect(isTaskInProgress('in_progress')).toBe(true);
      expect(isTaskInProgress('assigned')).toBe(false);

      expect(isTaskCompleted('completed')).toBe(true);
      expect(isTaskCompleted('in_progress')).toBe(false);

      expect(isTaskMutable('pending')).toBe(true);
      expect(isTaskMutable('assigned')).toBe(true);
      expect(isTaskMutable('in_progress')).toBe(false);
      expect(isTaskMutable('completed')).toBe(false);
      expect(isTaskMutable('cancelled')).toBe(false);
    });
  });

  describe('isDriverAvailable', () => {
    it('returns false when driver inactive', () => {
      expect(isDriverAvailable({ active: false })).toBe(false);
    });

    it('returns true when active and no availability override', () => {
      expect(isDriverAvailable({ active: true })).toBe(true);
      expect(isDriverAvailable({ active: true }, null)).toBe(true);
      expect(isDriverAvailable({ active: true }, undefined)).toBe(true);
    });

    it('returns true when active and availability available=true', () => {
      expect(isDriverAvailable({ active: true }, { available: true })).toBe(true);
    });

    it('returns false when active but availability available=false', () => {
      expect(isDriverAvailable({ active: true }, { available: false })).toBe(false);
    });
  });

  describe('findFirstFrozenStopIndex / findLastFrozenStopIndex / routeHasStartedStops', () => {
    it('returns -1 / false when no stops are frozen', () => {
      const stops = [
        { status: StopStatus.pending },
        { status: StopStatus.pending },
      ];
      expect(findFirstFrozenStopIndex(stops)).toBe(-1);
      expect(findLastFrozenStopIndex(stops)).toBe(-1);
      expect(routeHasStartedStops(stops)).toBe(false);
    });

    it('returns first index when only first stop is frozen', () => {
      const stops = [
        { status: StopStatus.done },
        { status: StopStatus.pending },
        { status: StopStatus.pending },
      ];
      expect(findFirstFrozenStopIndex(stops)).toBe(0);
      expect(findLastFrozenStopIndex(stops)).toBe(0);
      expect(routeHasStartedStops(stops)).toBe(true);
    });

    it('returns first/last correctly when multiple stops are frozen', () => {
      const stops = [
        { status: StopStatus.done },
        { status: StopStatus.done },
        { status: StopStatus.arrived },
        { status: StopStatus.pending },
        { status: StopStatus.pending },
      ];
      expect(findFirstFrozenStopIndex(stops)).toBe(0);
      expect(findLastFrozenStopIndex(stops)).toBe(2);
    });

    it('treats skipped as frozen', () => {
      const stops = [
        { status: StopStatus.done },
        { status: StopStatus.skipped },
        { status: StopStatus.pending },
      ];
      expect(findLastFrozenStopIndex(stops)).toBe(1);
    });
  });

  describe('isStopDispatcherCancelled / isStopExecuted (v1.1 R1.4)', () => {
    it('classifies executed-skipped vs dispatcher-cancelled by actualArrivalS', () => {
      const fieldSkipped = { status: StopStatus.skipped, actualArrivalS: 36000 };
      const dispatcherSkipped = { status: StopStatus.skipped, actualArrivalS: null };

      expect(isStopDispatcherCancelled(fieldSkipped)).toBe(false);
      expect(isStopDispatcherCancelled(dispatcherSkipped)).toBe(true);

      expect(isStopExecuted(fieldSkipped)).toBe(true);
      expect(isStopExecuted(dispatcherSkipped)).toBe(false);
    });

    it('done and arrived are always executed', () => {
      expect(isStopExecuted({ status: StopStatus.done, actualArrivalS: 36000 })).toBe(true);
      expect(isStopExecuted({ status: StopStatus.arrived, actualArrivalS: 36000 })).toBe(true);
    });

    it('pending is never executed nor dispatcher-cancelled', () => {
      const stop = { status: StopStatus.pending, actualArrivalS: null };
      expect(isStopExecuted(stop)).toBe(false);
      expect(isStopDispatcherCancelled(stop)).toBe(false);
    });
  });

  describe('findLastExecutedStopIndex / findFirstExecutedStopIndex (v1.1 R1.4)', () => {
    it('skips dispatcher-cancelled stops when finding executed bounds', () => {
      const stops = [
        { status: StopStatus.done, actualArrivalS: 36000 },
        { status: StopStatus.skipped, actualArrivalS: null }, // dispatcher-cancelled
        { status: StopStatus.skipped, actualArrivalS: null },
        { status: StopStatus.pending, actualArrivalS: null },
      ];
      expect(findLastExecutedStopIndex(stops)).toBe(0);
      expect(findFirstExecutedStopIndex(stops)).toBe(0);
      // Frozen indices include the dispatcher-cancelled stops
      expect(findLastFrozenStopIndex(stops)).toBe(2);
    });

    it('returns -1 when no stops are executed', () => {
      const stops = [
        { status: StopStatus.skipped, actualArrivalS: null },
        { status: StopStatus.pending, actualArrivalS: null },
      ];
      expect(findLastExecutedStopIndex(stops)).toBe(-1);
      expect(findFirstExecutedStopIndex(stops)).toBe(-1);
    });

    it('treats field-skipped stops as executed anchors', () => {
      const stops = [
        { status: StopStatus.done, actualArrivalS: 36000 },
        { status: StopStatus.skipped, actualArrivalS: 37500 }, // driver was there
        { status: StopStatus.pending, actualArrivalS: null },
      ];
      expect(findLastExecutedStopIndex(stops)).toBe(1);
    });
  });
});
