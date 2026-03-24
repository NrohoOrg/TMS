import apiClient from "@/services/api-client";
import type {
  ApiUser,
  CreateUserPayload,
  UpdateUserPayload,
  AdminConfig,
  UpdateConfigPayload,
  AdminHealthStatus,
} from "./types";

const ADMIN_PREFIX = "/admin";

// ── USERS ───────────────────────────────────────────────────────────────

export async function listUsers(): Promise<ApiUser[]> {
  const { data } = await apiClient.get<ApiUser[]>(`${ADMIN_PREFIX}/users`);
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  const { data } = await apiClient.post<ApiUser>(
    `${ADMIN_PREFIX}/users`,
    payload,
  );
  return data;
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<ApiUser> {
  const { data } = await apiClient.patch<ApiUser>(
    `${ADMIN_PREFIX}/users/${id}`,
    payload,
  );
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`${ADMIN_PREFIX}/users/${id}`);
}

// ── CONFIG ──────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AdminConfig> {
  const { data } = await apiClient.get<AdminConfig>(
    `${ADMIN_PREFIX}/config`,
  );
  return data;
}

export async function updateConfig(
  payload: UpdateConfigPayload,
): Promise<AdminConfig> {
  const { data } = await apiClient.patch<AdminConfig>(
    `${ADMIN_PREFIX}/config`,
    payload,
  );
  return data;
}

// ── HEALTH ──────────────────────────────────────────────────────────────

export async function getAdminHealth(): Promise<AdminHealthStatus> {
  const { data } = await apiClient.get<AdminHealthStatus>(
    `${ADMIN_PREFIX}/health`,
  );
  return data;
}
