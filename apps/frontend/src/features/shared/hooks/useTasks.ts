"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveTask,
  createCadreTask,
  createTask,
  deleteCadreTask,
  deleteTask,
  getMyCadreTasks,
  getTask,
  getTasks,
  importTasks,
  patchCadreTask,
  patchTask,
  rejectTask,
  type TaskListParams,
} from "@/lib/api-services";
import type { Task } from "@/types/api";

const TASKS_KEY = ["tasks"] as const;
const CADRE_TASKS_KEY = ["cadre-tasks"] as const;

export function useTasks(params?: TaskListParams) {
  return useQuery({
    queryKey: [...TASKS_KEY, params ?? {}],
    queryFn: () => getTasks(params),
  });
}

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, "detail", id],
    queryFn: () => getTask(id!),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task>) => createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => patchTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useImportTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importTasks(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useMyCadreTasks() {
  return useQuery({
    queryKey: CADRE_TASKS_KEY,
    queryFn: () => getMyCadreTasks(),
    refetchInterval: 15_000,
  });
}

export function useCreateCadreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task>) => createCadreTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CADRE_TASKS_KEY }),
  });
}

export function useUpdateCadreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      patchCadreTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CADRE_TASKS_KEY }),
  });
}

export function useDeleteCadreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCadreTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CADRE_TASKS_KEY }),
  });
}
