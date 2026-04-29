"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authLogin, authLogout, authMe } from "@/lib/api-services";
import type { AuthUser } from "@/types/api";

const ROLE_COOKIE = "tms_role";

function setRoleCookie(role: string | null) {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    authMe()
      .then((u) => {
        setUser(u);
        setRoleCookie(u.role);
      })
      .catch(() => {
        setUser(null);
        setRoleCookie(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    setRoleCookie(data.user.role);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // best-effort
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setRoleCookie(null);
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Re-export the canonical user type for convenience
export type User = AuthUser;
