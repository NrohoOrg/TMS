import {
  detectViolations,
  pickClosestDriver,
} from './urgent-interrupt';

describe('pickClosestDriver', () => {
  it('returns null when no drivers', () => {
    expect(pickClosestDriver([], { lat: 0, lng: 0 })).toBeNull();
  });

  it('uses depot when driver has no executed stops', () => {
    const result = pickClosestDriver(
      [
        {
          id: 'd1',
          name: 'Bob',
          depot: { lat: 36.0, lng: 3.0 },
          lastExecutedCoords: null,
        },
      ],
      { lat: 36.0, lng: 3.0 },
    );
    expect(result?.driverId).toBe('d1');
    expect(result?.fromDepot).toBe(true);
    expect(result?.distanceM).toBeCloseTo(0, 0);
  });

  it('uses last executed coords when present (driver mid-route)', () => {
    const result = pickClosestDriver(
      [
        {
          id: 'd1',
          name: 'Bob',
          depot: { lat: 36.0, lng: 3.0 }, // far from pickup
          lastExecutedCoords: { lat: 36.5, lng: 3.5 }, // close to pickup
        },
      ],
      { lat: 36.5, lng: 3.5 },
    );
    expect(result?.fromDepot).toBe(false);
    expect(result?.distanceM).toBeCloseTo(0, 0);
  });

  it('picks the geographically closest driver', () => {
    const result = pickClosestDriver(
      [
        {
          id: 'far',
          name: 'Far',
          depot: { lat: 35.0, lng: 2.0 },
          lastExecutedCoords: null,
        },
        {
          id: 'mid',
          name: 'Mid',
          depot: { lat: 36.5, lng: 3.0 },
          lastExecutedCoords: null,
        },
        {
          id: 'close',
          name: 'Close',
          depot: { lat: 36.75, lng: 3.06 },
          lastExecutedCoords: null,
        },
      ],
      { lat: 36.76, lng: 3.07 },
    );
    expect(result?.driverId).toBe('close');
  });

  it('a mid-route driver can beat a depot-bound driver', () => {
    const result = pickClosestDriver(
      [
        {
          id: 'depot-near',
          name: 'A',
          depot: { lat: 36.7, lng: 3.0 },
          lastExecutedCoords: null,
        },
        {
          id: 'mid-near',
          name: 'B',
          depot: { lat: 35.0, lng: 2.0 },
          lastExecutedCoords: { lat: 36.71, lng: 3.01 },
        },
      ],
      { lat: 36.71, lng: 3.01 },
    );
    expect(result?.driverId).toBe('mid-near');
  });
});

describe('detectViolations', () => {
  it('returns empty when no stop is late', () => {
    const v = detectViolations(
      [
        {
          stopId: 's1',
          taskId: 't1',
          type: 'pickup',
          taskTitle: 'A',
          recomputedEtaS: 36000,
          latestArrivalS: 39600,
          earliestArrivalS: 0,
        },
      ],
      17 * 3600,
      16 * 3600,
    );
    expect(v).toEqual([]);
  });

  it('flags a downstream stop whose new ETA exceeds latest allowed', () => {
    const v = detectViolations(
      [
        {
          stopId: 's1',
          taskId: 't1',
          type: 'pickup',
          taskTitle: 'Late Pickup',
          recomputedEtaS: 40000,
          latestArrivalS: 39600,
          earliestArrivalS: 0,
        },
      ],
      17 * 3600,
      16 * 3600,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({
      stopId: 's1',
      type: 'pickup',
      delaySeconds: 400,
    });
  });

  it('flags a shift overrun', () => {
    const v = detectViolations(
      [],
      16 * 3600, // shift ends 16:00
      16 * 3600 + 1800, // route ends 16:30
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ type: 'shift', delaySeconds: 1800 });
  });

  it('returns multiple violations when both stops and shift overrun', () => {
    const v = detectViolations(
      [
        {
          stopId: 's1',
          taskId: 't1',
          type: 'dropoff',
          taskTitle: 'X',
          recomputedEtaS: 60000,
          latestArrivalS: 50000,
          earliestArrivalS: 0,
        },
        {
          stopId: 's2',
          taskId: 't2',
          type: 'pickup',
          taskTitle: 'Y',
          recomputedEtaS: 65000,
          latestArrivalS: 64000,
          earliestArrivalS: 0,
        },
      ],
      55000,
      66000,
    );
    expect(v).toHaveLength(3);
    expect(v.map((x) => x.type)).toEqual(['dropoff', 'pickup', 'shift']);
  });
});
