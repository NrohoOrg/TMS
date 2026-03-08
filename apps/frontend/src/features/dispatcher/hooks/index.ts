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
