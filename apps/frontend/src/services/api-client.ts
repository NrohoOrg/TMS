import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

// ── Singleton token store (module-scoped, never in localStorage) ──────
let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}
export function setAccessToken(token: string | null) {
  accessToken = token;
}

// ── Refresh-token helpers (persisted so the session survives reloads) ──
const REFRESH_KEY = "tms_refresh_token";

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(REFRESH_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

// ── Axios instance ────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Request interceptor: attach access token ──────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: unwrap envelope + silent refresh ────────────
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the standard { success, data } envelope when present
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefreshToken();

      if (!refresh) {
        clearTokens();
        return Promise.reject(error);
      }

      try {
        // Dedupe concurrent refresh calls
        if (!refreshPromise) {
          refreshPromise = requestNewTokens(refresh);
        }
        const newAccessToken = await refreshPromise;
        refreshPromise = null;

        // Retry the original request with the fresh token
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(original);
      } catch {
        refreshPromise = null;
        clearTokens();
        // Redirect to login when refresh fails (token expired / revoked)
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Calls the refresh endpoint directly (bypasses interceptors to avoid loops).
 * Stores the new token pair and returns the new access token.
 */
async function requestNewTokens(refreshToken: string): Promise<string> {
  const { data } = await axios.post<{
    success: boolean;
    data: { token: string; refreshToken: string };
  }>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );

  const payload = data.data ?? data;
  setAccessToken((payload as { token: string }).token);
  setRefreshToken((payload as { refreshToken: string }).refreshToken);
  return (payload as { token: string }).token;
}

export default apiClient;
