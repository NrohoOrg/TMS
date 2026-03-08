import apiClient from "@/services/api-client";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from "../types";

const AUTH = API_ENDPOINTS.AUTH;

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(AUTH.LOGIN, credentials);
  return data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>(AUTH.REFRESH, {
    refreshToken,
  });
  return data;
}

export async function logout(): Promise<LogoutResponse> {
  const { data } = await apiClient.post<LogoutResponse>(AUTH.LOGOUT, {});
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>(AUTH.ME);
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post(AUTH.PASSWORD_RESET, { email });
  return data;
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const { data } = await apiClient.post(AUTH.PASSWORD_RESET_CONFIRM, {
    token,
    newPassword,
  });
  return data;
}
