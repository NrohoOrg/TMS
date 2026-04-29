"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRouteToPlan,
  addTaskToRoute,
  createDraftPlan,
  deletePlan,
  getUnassignedTasksForDate,
  moveStop,
  recalculatePlan,
  removeRoute,
  removeStopFromRoute,
  updatePlanMeta,
  updateStopMeta,
} from "@/lib/api-services";
import { PLANS_KEY } from "./usePlans";

export function useUnassignedTasks(planId: string | null | undefined, date: string | null | undefined) {
  return useQuery({
    queryKey: ["unassigned-tasks", planId, date],
    queryFn: () => getUnassignedTasksForDate(planId!, date!),
    enabled: !!planId && !!date,
  });
}

export function useCreateDraftPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; notes?: string }) => createDraftPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useUpdatePlanMeta(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { notes?: string }) => updatePlanMeta(planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useRecalculatePlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recalculatePlan(planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] }),
  });
}

export function useAddRouteToPlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { driverId: string }) => addRouteToPlan(planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] }),
  });
}

export function useRemoveRoute(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) => removeRoute(routeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] }),
  });
}

export function useAddTaskToRoute(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { routeId: string; taskId: string; insertAtSequence?: number }) =>
      addTaskToRoute(params.routeId, {
        taskId: params.taskId,
        insertAtSequence: params.insertAtSequence,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] });
      qc.invalidateQueries({ queryKey: ["unassigned-tasks"] });
    },
  });
}

export function useMoveStop(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { stopId: string; targetRouteId?: string; targetSequence: number }) =>
      moveStop(params.stopId, {
        targetRouteId: params.targetRouteId,
        targetSequence: params.targetSequence,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] }),
  });
}

export function useUpdateStopMeta(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      stopId: string;
      data: { locked?: boolean; notes?: string; etaSecondsOverride?: number };
    }) => updateStopMeta(params.stopId, params.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] }),
  });
}

export function useRemoveStop(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stopId: string) => removeStopFromRoute(stopId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PLANS_KEY, planId] });
      qc.invalidateQueries({ queryKey: ["unassigned-tasks"] });
    },
  });
}
