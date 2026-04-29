"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getJobStatus,
  getPlan,
  getPlans,
  listPlansFiltered,
  publishPlan,
  sendTestSms,
  triggerOptimize,
} from "@/lib/api-services";

export const PLANS_KEY = ["plans"] as const;

export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEY,
    queryFn: getPlans,
  });
}

export function usePlansFiltered(params?: { date?: string; status?: "draft" | "published" }) {
  return useQuery({
    queryKey: [...PLANS_KEY, "filtered", params ?? {}],
    queryFn: () => listPlansFiltered(params),
  });
}

export function usePlan(planId: string | null | undefined) {
  return useQuery({
    queryKey: [...PLANS_KEY, planId],
    queryFn: () => getPlan(planId!),
    enabled: !!planId,
  });
}

export function useTriggerOptimize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; returnToDepot?: boolean }) => triggerOptimize(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useJobStatus(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const status = (q.state.data as { status?: string } | undefined)?.status;
      if (status === "completed" || status === "failed") return false;
      return 2_000;
    },
  });
}

export function usePublishPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => publishPlan(planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useSendTestSms() {
  return useMutation({
    mutationFn: () => sendTestSms(),
  });
}
