"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import * as authApi from "../api";
import { useAuthStore } from "../store";
import {
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
} from "@/services/api-client";
import type { LoginCredentials, AuthUser } from "../types";

// ── Query keys ──────────────────────────────────────────────────────────
export const authKeys = {
  me: ["auth", "me"] as const,
};

// ── Role → route mapping ────────────────────────────────────────────────
const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  DISPATCHER: "/dispatcher",
};

function homeRouteForUser(user: AuthUser) {
  return ROLE_ROUTES[user.role] ?? "/login";
}

// ── useLogin ────────────────────────────────────────────────────────────
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setSession(data.user, data.token, data.refreshToken);
      router.push(homeRouteForUser(data.user));
    },
  });
}

// ── useLogout ───────────────────────────────────────────────────────────
export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.push("/login");
    },
  });
}

// ── useSessionBootstrap ─────────────────────────────────────────────────
/**
 * Runs once on app mount. If a refresh token exists in storage it performs:
 *   1. POST /auth/refresh → get new access + refresh token
 *   2. GET  /auth/me      → hydrate user into store
 * On failure it clears tokens and lets the user land on /login naturally.
 */
export function useSessionBootstrap() {
  const { setUser, clearSession, setLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        // 1. Refresh tokens
        const tokens = await authApi.refresh(refreshToken);
        setAccessToken(tokens.token);
        setRefreshToken(tokens.refreshToken);

        // 2. Fetch user profile
        const user = await authApi.getMe();
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) clearSession();
      }
    }

    if (!isAuthenticated) {
      bootstrap();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── useCurrentUser (TanStack Query with background refresh) ─────────
export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// ── useRequireAuth ──────────────────────────────────────────────────────
/**
 * Redirect to /login if the session bootstrap finished and user is
 * not authenticated. Use in layouts that require auth.
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading, user };
}

// ── useRedirectIfAuthenticated ──────────────────────────────────────────
/**
 * Used on the login page: if user is already authenticated, skip login.
 */
export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(homeRouteForUser(user));
    }
  }, [isAuthenticated, isLoading, user, router]);

  return { isLoading };
}
