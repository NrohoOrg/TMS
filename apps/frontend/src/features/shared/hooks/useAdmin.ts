"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminConfig,
  getAdminHealth,
  getAdminUsers,
  patchAdminConfig,
  patchAdminUser,
} from "@/lib/api-services";
import type { AdminConfig, AdminUser } from "@/types/api";

export function useAdminHealth(opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: getAdminHealth,
    refetchInterval: opts?.refetchIntervalMs ?? 30_000,
  });
}

export function useAdminConfig() {
  return useQuery({
    queryKey: ["admin", "config"],
    queryFn: getAdminConfig,
  });
}

export function useUpdateAdminConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminConfig>) => patchAdminConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "config"] }),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      name?: string;
      phone?: string;
      password: string;
      role: "ADMIN" | "DISPATCHER" | "CADRE";
    }) => createAdminUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) =>
      patchAdminUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
