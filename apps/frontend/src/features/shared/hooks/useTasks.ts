"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  importTasks,
  patchTask,
  type TaskListParams,
} from "@/lib/api-services";
import type { Task } from "@/types/api";

const TASKS_KEY = ["tasks"] as const;

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
