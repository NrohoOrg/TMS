"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tasksApi from "../api";
import type { CreateTaskPayload, ListTasksParams } from "../types";

// ── Query keys ──────────────────────────────────────────────────────────
export const taskKeys = {
  all: ["tasks"] as const,
  list: (params?: ListTasksParams) =>
    [...taskKeys.all, "list", params] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
};

// ── DRIVERS ─────────────────────────────────────────────────────────────

export const driverKeys = {
  all: ["drivers"] as const,
  list: () => [...driverKeys.all, "list"] as const,
  detail: (id: string) => [...driverKeys.all, "detail", id] as const,
};

export function useDriversList() {
  return useQuery({
    queryKey: driverKeys.list(),
    queryFn: () => tasksApi.listDrivers(),
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof tasksApi.createDriver>[0]) =>
      tasksApi.createDriver(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof tasksApi.updateDriver>[1];
    }) => tasksApi.updateDriver(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}

// ── AVAILABILITY ────────────────────────────────────────────────────────

export const availabilityKeys = {
  all: ["availability"] as const,
  list: (params?: Parameters<typeof tasksApi.listAvailability>[0]) =>
    [...availabilityKeys.all, "list", params] as const,
};

export function useAvailabilityList(
  params?: Parameters<typeof tasksApi.listAvailability>[0],
) {
  return useQuery({
    queryKey: availabilityKeys.list(params),
    queryFn: () => tasksApi.listAvailability(params),
  });
}

export function useUpsertAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driverId,
      payload,
    }: {
      driverId: string;
      payload: Parameters<typeof tasksApi.upsertAvailability>[1];
    }) => tasksApi.upsertAvailability(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

// ── PLANNING / OPTIMIZATION ────────────────────────────────────────────

export const planningKeys = {
  all: ["planning"] as const,
  jobs: () => [...planningKeys.all, "jobs"] as const,
  jobStatus: (jobId: string) =>
    [...planningKeys.jobs(), jobId] as const,
  plans: () => [...planningKeys.all, "plans"] as const,
  planDetail: (planId: string) =>
    [...planningKeys.plans(), planId] as const,
};

export function useStartOptimization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Parameters<typeof tasksApi.startOptimization>[0],
    ) => tasksApi.startOptimization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.plans() });
    },
  });
}

export function useOptimizationStatus(jobId: string) {
  return useQuery({
    queryKey: planningKeys.jobStatus(jobId),
    queryFn: () => tasksApi.getOptimizationStatus(jobId),
    enabled: !!jobId,
    refetchInterval: 2000, // Poll every 2 seconds
  });
}

export function usePlansList() {
  return useQuery({
    queryKey: planningKeys.plans(),
    queryFn: () => tasksApi.listPlans(),
  });
}

export function usePlanDetail(planId: string) {
  return useQuery({
    queryKey: planningKeys.planDetail(planId),
    queryFn: () => tasksApi.getPlanDetail(planId),
    enabled: !!planId,
  });
}

export function usePublishPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => tasksApi.publishPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.plans() });
    },
  });
}

export function useUpdateStopStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stopId,
      payload,
    }: {
      stopId: string;
      payload: Parameters<typeof tasksApi.updateStopStatus>[1];
    }) => tasksApi.updateStopStatus(stopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.plans() });
    },
  });
}

// ── GEOCODING ───────────────────────────────────────────────────────────

export const geocodeKeys = {
  all: ["geocode"] as const,
  search: (query: string) =>
    [...geocodeKeys.all, "search", query] as const,
};

export function useGeocodeSearch(query: string) {
  return useQuery({
    queryKey: geocodeKeys.search(query),
    queryFn: () => tasksApi.geocodeSearch({ q: query }),
    enabled: query.length > 0,
  });
}



// ── useTasksList ────────────────────────────────────────────────────────
export function useTasksList(params?: ListTasksParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.listTasks(params),
  });
}

// ── useTaskDetail ───────────────────────────────────────────────────────
export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });
}

// ── useCreateTask ───────────────────────────────────────────────────────
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// ── useUpdateTask ───────────────────────────────────────────────────────
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreateTaskPayload>;
    }) => tasksApi.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// ── useDeleteTask ───────────────────────────────────────────────────────
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// ── useImportTasks ──────────────────────────────────────────────────────
export function useImportTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => tasksApi.importTasks(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
