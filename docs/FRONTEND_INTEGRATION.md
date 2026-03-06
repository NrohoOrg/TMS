# Frontend Integration Guide

This guide is for the Next.js frontend developer integrating with the NestJS backend in `apps/api`. It assumes you know React/Next.js but not the backend details.

All examples are based on the actual source code under `apps/api/src`.

---

## Local Dev Setup (Step by Step)

From the monorepo root `TMS/`:

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Edit .env and adjust as needed
# - DATABASE_URL (Postgres)
# - REDIS_URL (Redis)
# - JWT_SECRET
# - JWT_ACCESS_EXPIRES_IN (default 15m)
# - JWT_REFRESH_EXPIRES_IN (default 7d)
# - API_PORT (default 3001)
# - OPTIMIZER_URL (used by backend to call optimizer)
# - NOMINATIM_URL (geocoding endpoint)

# 3. Install dependencies (Node + Python)
pnpm install
pip install -r apps/optimizer/requirements.txt

# 4. Generate Prisma client (required for typechecking)
pnpm --filter api prisma generate

# 5. Start infrastructure (Postgres + Redis only)
nx run infra:up

# 6. Run database migrations + seed
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed

# 7. Start the API (NestJS)
nx run api:serve

# 8. Verify it's working
curl http://localhost:3001/health
# Expected: { "status": "ok", ... } (raw, not wrapped)

# 9. (Optional) Start optimizer service from Nx dev
nx run optimizer:serve

# 10. Open Swagger — full interactive API docs
# http://localhost:3001/api/docs
```

Notes:

- API port is derived from `apps/api/src/main.ts` and `.env.example`: `API_PORT` defaults to `3001`.
- All API routes (except `/health`) are prefixed with `/api`, e.g. `/api/auth/login`, `/api/dispatcher/tasks`.

---

## Environment Variables for the Frontend

In the Next.js app (`apps/frontend`), create or update `.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

This is the base URL for the backend in local dev. Use `NEXT_PUBLIC_API_URL` only from the browser/React side; do not hardcode ports in components.

Authentication tokens are stored in `localStorage` (see API client below), so you do **not** need extra env vars for auth on the frontend.

---

## Response Envelope

The backend uses a global interceptor (`TransformResponseInterceptor`) that wraps all responses in a standard envelope:

- **Success**

```json
{
  "success": true,
  "data": { ...actual payload... }
}
```

- **Error**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "errors": [
        { "field": "fieldName", "message": "What went wrong" }
      ]
    }
  }
}
```

The API client below **unwraps** this so your components only see the inner payload or a thrown error.

---

## Base API Client (`apps/frontend/lib/api.ts`)

This client:

- Reads base URL from `NEXT_PUBLIC_API_URL`.
- Attaches `Authorization: Bearer {token}` if an access token is stored.
- Unwraps `{ success, data }` envelopes on success.
- On `401`:
  - Tries `/api/auth/refresh` once using the stored refresh token.
  - Stores the new token pair.
  - Replays the original request.
  - If refresh fails, clears storage and redirects to `/login`.
- Throws a typed error with `{ code, message, details? }` on API-level errors.
- Uses `localStorage` for simplicity (trade-off: more exposed than httpOnly cookies).

Create `apps/frontend/lib/api.ts` with:

```typescript
// apps/frontend/lib/api.ts

export type ApiError = {
  code: string;
  message: string;
  details?: {
    errors: { field: string; message: string }[];
  };
  status?: number;
};

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.NEXT_PUBLIC_API_URL ?? window.location.origin.replace(/:\d+$/, ':3001'));

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(token: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function redirectToLogin() {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function rawRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const url = `${API_BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
    credentials: 'include',
  });

  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON or empty body
    throw {
      code: 'SERVER_ERROR',
      message: `Unexpected response from server (status ${res.status})`,
      status: res.status,
    } satisfies ApiError;
  }

  if (!json.success) {
    const error = json.error ?? {
      code: 'SERVER_ERROR',
      message: 'Unknown error',
    };
    throw { ...error, status: res.status } as ApiError;
  }

  return json.data as T;
}

async function requestWithRefresh<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  try {
    return await rawRequest<T>(method, path, body, options);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status !== 401) {
      throw apiError;
    }

    // Attempt refresh once
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      await redirectToLogin();
      throw apiError;
    }

    try {
      type RefreshResponse = { token: string; refreshToken: string };
      const refreshData = await rawRequest<RefreshResponse>('POST', '/auth/refresh', {
        refreshToken,
      });

      setTokens(refreshData.token, refreshData.refreshToken);

      // Retry original request with new token
      return await rawRequest<T>(method, path, body, options);
    } catch {
      await redirectToLogin();
      throw apiError;
    }
  }
}

export const apiClient = {
  get<T = unknown>(path: string, options?: { signal?: AbortSignal }) {
    return requestWithRefresh<T>('GET', path, undefined, options);
  },
  post<T = unknown>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return requestWithRefresh<T>('POST', path, body, options);
  },
  patch<T = unknown>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return requestWithRefresh<T>('PATCH', path, body, options);
  },
  put<T = unknown>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return requestWithRefresh<T>('PUT', path, body, options);
  },
  delete<T = unknown>(path: string, options?: { signal?: AbortSignal }) {
    return requestWithRefresh<T>('DELETE', path, undefined, options);
  },
};
```

Usage:

```typescript
const tasks = await apiClient.get<YourTypeHere>('/dispatcher/tasks');
const created = await apiClient.post('/dispatcher/tasks', body);
```

The client always calls `/api/...` relative to `NEXT_PUBLIC_API_URL`.

---

## Auth Flow

### Login

Backend source: `apps/api/src/auth/auth.controller.ts`, `AuthController.login`.

- Endpoint: `POST /api/auth/login`
- Body (`LoginDto`): `{ email: string; password: string }`
- Response (wrapped; inner payload from `AuthService.login`):

```json
{
  "token": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "ADMIN",
    "phone": "+213...",
    "avatar": null,
    "expiresIn": 900
  }
}
```

Frontend login example:

```typescript
// Somewhere in your login page
import { apiClient } from '@/lib/api';

type LoginResponse = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: 'ADMIN' | 'DISPATCHER';
    phone: string | null;
    avatar: string | null;
    expiresIn: number;
  };
};

async function handleLogin(email: string, password: string) {
  const { token, refreshToken, user } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }
}
```

### Authenticated requests

Once tokens are stored, the `apiClient` attaches `Authorization: Bearer {token}` automatically. Just call:

```typescript
const me = await apiClient.get('/auth/me');
const tasks = await apiClient.get('/dispatcher/tasks');
```

### Token refresh

- Endpoint: `POST /api/auth/refresh`
- Body (`RefreshDto`): `{ refreshToken: string }`
- Response: `{ token: string; refreshToken: string }`

The client retries 401s once by calling this endpoint and replays the original request. You do not need to call `/auth/refresh` manually.

### Logout

- Endpoint: `POST /api/auth/logout`
- Behavior: revokes all active refresh tokens for the current user.

Frontend:

```typescript
import { apiClient } from '@/lib/api';

async function logout() {
  try {
    await apiClient.post('/auth/logout', {});
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/login';
    }
  }
}
```

---

## Working Endpoints vs Stubs

### Fully Implemented (safe to integrate)

This list is not exhaustive, but includes the main flows the frontend will use:

| Method | Path                                      | What it does                                          |
|--------|-------------------------------------------|-------------------------------------------------------|
| POST   | `/api/auth/login`                        | Login, returns token pair + user                     |
| POST   | `/api/auth/refresh`                      | Rotate refresh token, returns new token pair         |
| POST   | `/api/auth/logout`                       | Revoke current user’s refresh tokens                 |
| GET    | `/api/auth/me`                           | Get current user profile                             |
| GET    | `/api/dispatcher/tasks`                  | List tasks (filters + pagination)                    |
| GET    | `/api/dispatcher/tasks/:id`              | Get task details                                     |
| POST   | `/api/dispatcher/tasks`                  | Create task                                          |
| PATCH  | `/api/dispatcher/tasks/:id`              | Update task                                          |
| DELETE | `/api/dispatcher/tasks/:id`              | Cancel task                                          |
| POST   | `/api/dispatcher/tasks/import`           | Bulk import tasks from CSV                           |
| GET    | `/api/dispatcher/drivers`                | List active drivers                                  |
| POST   | `/api/dispatcher/drivers`                | Create driver                                        |
| PATCH  | `/api/dispatcher/drivers/:id`            | Update driver                                        |
| DELETE | `/api/dispatcher/drivers/:id`            | Soft delete driver                                   |
| GET    | `/api/dispatcher/availability`           | Availability per driver for a date                   |
| PATCH  | `/api/dispatcher/availability/:driverId` | Upsert driver availability                           |
| POST   | `/api/dispatcher/planning/optimize`      | Kick off optimization job                            |
| GET    | `/api/dispatcher/planning/status/:jobId` | Check optimization job status                        |
| GET    | `/api/dispatcher/planning/plans`         | List plans                                           |
| GET    | `/api/dispatcher/planning/plans/:planId` | Get full plan details                                |
| POST   | `/api/dispatcher/planning/plans/:planId/publish` | Publish draft plan                         |
| GET    | `/api/geocode/search`                    | Geocode search via Nominatim                         |
| GET    | `/health`                                | Plain health check                                   |

### Stubbed / Not Implemented

Endpoints that explicitly return 501:

| Method | Path                               | Why deferred                                  |
|--------|------------------------------------|-----------------------------------------------|
| POST   | `/api/auth/password-reset`        | Email service not wired                       |
| POST   | `/api/auth/password-reset/confirm`| Email + token-based reset flow not implemented|

Do not wire these up in the frontend yet; show a “Contact admin” message instead.

---

## Error Codes

Source: `apps/api/src/common/filters/http-exception.filter.ts`.

| Code               | HTTP Status | When it happens                                      | Suggested UI action                                   |
|--------------------|------------|------------------------------------------------------|------------------------------------------------------|
| `INVALID_CREDENTIALS` | 401     | Login failed (wrong email/password)                  | Show inline “Invalid email or password”              |
| `UNAUTHORIZED`     | 401        | Missing/invalid token on protected endpoints         | Redirect to login page                               |
| `FORBIDDEN`        | 403        | Authenticated but lacking required role              | Show “You don’t have access to this section”         |
| `NOT_FOUND`        | 404        | Resource not found (e.g. task/plan/driver)          | Show 404-style message / “Item not found”            |
| `CONFLICT`         | 409        | Business conflict (e.g. cannot cancel assigned task)| Show toast with backend message, refresh relevant UI |
| `VALIDATION_ERROR` | 400        | DTO validation fails                                 | Highlight fields using `error.details.errors`        |
| `RATE_LIMIT`       | 429        | Too many requests (throttling)                       | Show “You’re doing that too often, try again later”  |
| `SERVER_ERROR`     | 500        | Unhandled errors                                     | Show generic error, consider logging to Sentry       |
| `NOT_IMPLEMENTED`  | 501        | Password reset endpoints                             | Show “Feature not available, contact administrator”  |

The API client surfaces these via thrown `ApiError`; use `error.code` to branch in UI.

---

## Key Workflows (with Code)

### 1. Optimization Flow

#### Step 1: Create tasks (if needed)

```typescript
import { apiClient } from '@/lib/api';

async function createTask() {
  const task = await apiClient.post('/dispatcher/tasks', {
    title: 'Airport pickup',
    pickupAddress: 'Algiers Airport — Terminal 1',
    pickupLat: 36.691,
    pickupLng: 3.215,
    pickupWindowStart: '2026-03-01T08:00:00.000Z',
    pickupWindowEnd: '2026-03-01T09:00:00.000Z',
    dropoffAddress: 'Hotel Sofitel Algiers',
    dropoffLat: 36.753,
    dropoffLng: 3.058,
    dropoffDeadline: '2026-03-01T10:00:00.000Z',
    priority: 'urgent',
  });
  return task;
}
```

#### Step 2: Kick off optimization

```typescript
type OptimizeJobResponse = {
  id: string; // OptimizationJob.id (jobId)
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent: number;
  planId?: string;
  error?: string | null;
};

async function startOptimization(date: string) {
  const job = await apiClient.post<OptimizeJobResponse>('/dispatcher/planning/optimize', {
    date, // e.g. '2026-03-05'
    // other OptimizeDto fields as needed (see Swagger)
  });

  return job;
}
```

#### Step 3: Poll until done

```typescript
type PlanningJobStatusResponse = {
  id: string; // jobId
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent: number;
  planId?: string;
  error?: string | null;
};

async function pollOptimization(jobId: string): Promise<string> {
  const status = await apiClient.get<PlanningJobStatusResponse>(
    `/dispatcher/planning/status/${jobId}`,
  );

  if (status.status === 'completed' && status.planId) {
    return status.planId;
  }

  if (status.status === 'failed') {
    throw new Error(status.error ?? 'Optimization failed');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  return pollOptimization(jobId);
}
```

#### Step 4: Fetch the plan

```typescript
type PlanDetailsResponse = {
  id: string;
  date: string;
  status: 'draft' | 'published';
  // plus stats, routes, unassigned, etc. – see Swagger / planning.service
};

async function getPlan(planId: string) {
  return apiClient.get<PlanDetailsResponse>(`/dispatcher/planning/plans/${planId}`);
}
```

### 2. Task Creation with Geocoding

Recommended UX:

1. User types an address.
2. Frontend calls `/api/geocode/search?query=...`.
3. User picks a result.
4. Frontend creates a task using the chosen `lat`/`lng`.

```typescript
type GeocodeSearchResult = {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
  importance: number | null;
};

async function searchAddress(query: string) {
  const results = await apiClient.get<GeocodeSearchResult[]>(`/geocode/search?query=${encodeURIComponent(query)}`);
  return results;
}

async function createTaskFromGeocode(result: GeocodeSearchResult) {
  const task = await apiClient.post('/dispatcher/tasks', {
    title: result.displayName,
    pickupAddress: result.displayName,
    pickupLat: result.lat,
    pickupLng: result.lng,
    // fill in dropoff fields, time windows, etc.
  });
  return task;
}
```

### 3. Auth-Gated Page Pattern (Next.js)

Pattern: read `user` from `localStorage` on the client and redirect to `/login` if missing.

Example React hook:

```typescript
// apps/frontend/hooks/useAuthGuard.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router]);

  return { ready };
}
```

Usage in a client component page:

```typescript
'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function DispatcherPage() {
  const { ready } = useAuthGuard();
  if (!ready) return null; // or a spinner

  return <div>Dispatcher dashboard...</div>;
}
```

For stricter protection (including SSR), consider adding middleware or a server-side session check later.

---

## API Envelope Recap

You never need to manually unwrap `{ success, data }` in your pages/components. Always use the `apiClient`:

```typescript
// Good
const tasks = await apiClient.get('/dispatcher/tasks');

// Avoid
const raw = await fetch(...);
const parsed = await raw.json(); // you'll have to handle success/error yourself
```

The only place you should directly read `error.code`/`error.message` is in error boundaries or explicit `try/catch` blocks when you want to display specific messages.

