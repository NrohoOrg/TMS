import { create } from "zustand";
import type { AuthUser } from "../types";
import {
  clearTokens,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/services/api-client";

interface AuthState {
  /** Current authenticated user (null while unknown or logged-out) */
  user: AuthUser | null;
  /** true while the initial session bootstrap is running */
  isLoading: boolean;
  /** Convenience derived flag */
  isAuthenticated: boolean;

  /** Called after a successful login */
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  /** Called after a successful /auth/me rehydration */
  setUser: (user: AuthUser) => void;
  /** Clear everything (logout / expired refresh) */
  clearSession: () => void;
  /** Toggle the loading state */
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // starts true — we attempt rehydration on mount
  isAuthenticated: false,

  setSession: (user, accessToken, refreshToken) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false });
  },

  clearSession: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

/**
 * Returns true when there is a refresh token persisted — meaning
 * we should attempt a silent rehydration on app boot.
 */
export function hasPersistentSession(): boolean {
  return !!getRefreshToken();
}
