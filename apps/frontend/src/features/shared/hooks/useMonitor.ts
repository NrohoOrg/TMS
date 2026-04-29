"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMonitor, updateStopStatus } from "@/lib/api-services";

export function useMonitor(date?: string, opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: ["monitor", date ?? "today"],
    queryFn: () => getMonitor(date),
    refetchInterval: opts?.refetchIntervalMs ?? 10_000,
  });
}

export function useUpdateStopStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      stopId: string;
      status: "arrived" | "done" | "skipped";
      actualArrivalTime?: string;
      notes?: string;
    }) =>
      updateStopStatus(params.stopId, {
        status: params.status,
        actualArrivalTime: params.actualArrivalTime,
        notes: params.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitor"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
