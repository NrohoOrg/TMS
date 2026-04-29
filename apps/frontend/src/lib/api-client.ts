const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.tms.nroho.dz/api";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function setTokens(token: string, refreshToken: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}

// ---------------------------------------------------------------------------
// Refresh logic
// ---------------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const json = await res.json();
      if (!json.success) return false;

      setTokens(json.data.token, json.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData — the browser sets the boundary automatically
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  // The /auth/* endpoints are unauthenticated (or are themselves the refresh
  // path) — a 401 from them is a real "wrong credentials" / "expired refresh
  // token" answer, not a stale-access-token signal. Triggering the silent
  // refresh + full-page redirect flow on a login attempt would wipe the React
  // state we just set to show the error.
  const isAuthEndpoint = path.startsWith("/auth/");

  // Handle 401 — attempt a silent token refresh once (only on real API calls)
  if (res.status === 401 && !retried && !isAuthEndpoint) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, true);
    }

    // Refresh failed — clear everything and redirect
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  // 204 No Content: success with empty body — never try to parse it.
  if (res.status === 204) {
    return undefined as T;
  }

  // Try to parse the body so we can surface a meaningful error message.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = res.ok ? {} : { error: res.statusText };
  }

  if (!res.ok || body.success === false) {
    // NestJS error responses can come back in three shapes:
    //   { message, error, statusCode }                        — raw HttpException
    //   { success: false, error: { code, message } }          — global wrapper
    //   { success: false, error: "..." }                      — wrapper, string
    const errObj = typeof body.error === "object" && body.error !== null ? body.error : null;
    const message =
      (errObj && typeof errObj.message === "string" ? errObj.message : null) ??
      (typeof body.message === "string" ? body.message : null) ??
      (typeof body.error === "string" ? body.error : null) ??
      (Array.isArray(body.message) ? body.message.join(", ") : null) ??
      `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  // Unwrap { success: true, data: T } envelope if present, otherwise return body as-is
  return body.data !== undefined ? body.data : body;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
