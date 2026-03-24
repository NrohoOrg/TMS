"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "./api";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UpdateConfigPayload,
} from "./types";

// ── QUERY KEYS ──────────────────────────────────────────────────────────

export const adminKeys = {
  all: ["admin"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  userDetail: (id: string) => [...adminKeys.users(), id] as const,
  config: () => [...adminKeys.all, "config"] as const,
  health: () => [...adminKeys.all, "health"] as const,
};

// ── USERS ───────────────────────────────────────────────────────────────

export function useUsersList() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => adminApi.listUsers(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// ── CONFIG ──────────────────────────────────────────────────────────────

export function useAdminConfig() {
  return useQuery({
    queryKey: adminKeys.config(),
    queryFn: () => adminApi.getConfig(),
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateConfigPayload) =>
      adminApi.updateConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
    },
  });
}

// ── HEALTH ──────────────────────────────────────────────────────────────

export function useAdminHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: () => adminApi.getAdminHealth(),
  });
}
