"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markDriverUnavailable,
  previewDriverUnavailable,
  runMidDayReoptimization,
  runUrgentInterrupt,
  type DriverUnavailablePreview,
  type DriverUnavailableResult,
  type MidDayResult,
  type UrgentInterruptResult,
} from "@/lib/api-services";

/**
 * v1.1 R1.3 — preview the effect of marking a driver unavailable.
 * Implemented as a mutation (not a query) because it's user-triggered
 * by clicking the "Preview" button rather than a passive read.
 */
export function usePreviewDriverUnavailable() {
  return useMutation<
    DriverUnavailablePreview,
    Error,
    { driverId: string; date?: string }
  >({
    mutationFn: ({ driverId, date }) => previewDriverUnavailable(driverId, date),
  });
}

export function useMarkDriverUnavailable() {
  const qc = useQueryClient();
  return useMutation<
    DriverUnavailableResult,
    Error,
    { driverId: string; date: string; fromTime: string; toTime?: string }
  >({
    mutationFn: (input) => markDriverUnavailable(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["monitor"] });
    },
  });
}

/** v1.1 R1.5 — trigger mid-day re-optimization. */
export function useRunMidDayReoptimization() {
  const qc = useQueryClient();
  return useMutation<
    MidDayResult,
    Error,
    { date?: string; dryRun?: boolean } | void
  >({
    mutationFn: (input) => runMidDayReoptimization(input?.date, input?.dryRun),
    onSuccess: (result) => {
      // Only invalidate caches when the call actually persisted changes.
      if (!result.dryRun) {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["plans"] });
        qc.invalidateQueries({ queryKey: ["monitor"] });
      }
    },
  });
}

/** v1.1 R1.6 — divert the closest active driver to an urgent task. */
export function useRunUrgentInterrupt() {
  const qc = useQueryClient();
  return useMutation<
    UrgentInterruptResult,
    Error,
    { taskId: string; date?: string }
  >({
    mutationFn: ({ taskId, date }) => runUrgentInterrupt(taskId, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["monitor"] });
    },
  });
}
