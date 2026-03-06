# Backend Overview

This document maps the NestJS backend for the TMS monorepo so a frontend engineer can navigate it without reading every file.

---

## Tech Stack

- **NestJS 10** – HTTP server framework for the API in `apps/api` (routing, DI, modules, Swagger).
- **Prisma 5** – Type-safe ORM for PostgreSQL, schema in `apps/api/prisma/schema.prisma`, generates `@prisma/client`.
- **PostgreSQL 16** – Primary relational database, container started by `docker-compose.yml` (`postgres` service).
- **Redis 7** – In-memory store used for queues/caching (see `apps/api/src/redis` and `/admin/health`).
- **BullMQ 5** – Job queue used for optimization jobs (see `apps/api/src/planning/optimization.queue.ts` and worker).
- **FastAPI + OR-Tools** – Python optimizer service in `apps/optimizer` that solves the vehicle routing problem.

All responses are wrapped by a global interceptor as:

- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": { code, message, details? } }`

---

## Repo Structure

```text
TMS/
├── apps/
│   ├── frontend/                 # Next.js frontend (separate app, not detailed here)
│   ├── api/                      # NestJS REST API — main backend
│   │   ├── src/
│   │   │   ├── admin/            # Admin-only endpoints (config, health, user management)
│   │   │   ├── auth/             # JWT auth: login, refresh, logout, /auth/me
│   │   │   ├── availability/     # Dispatcher: driver availability per date
│   │   │   ├── common/           # Shared decorators, guards, types, interceptors, filters
│   │   │   ├── driver-app/       # (Driver-specific API surface; see controllers inside)
│   │   │   ├── drivers/          # Dispatcher: CRUD for drivers
│   │   │   ├── geocode/          # Nominatim-backed geocoding with cache
│   │   │   ├── planning/         # Dispatcher: optimization jobs, plans, publish
│   │   │   ├── prisma/           # Prisma service + DB access helpers
│   │   │   ├── redis/            # Redis connection + health checks
│   │   │   ├── routing/          # Routing helpers / OSRM integration (used by planning)
│   │   │   ├── tasks/            # Dispatcher: task CRUD + CSV import
│   │   │   ├── app.module.ts     # Root Nest module wiring all feature modules
│   │   │   ├── health.controller.ts # `/health` endpoint (unwrapped, no /api prefix)
│   │   │   └── main.ts           # Bootstrap: global prefix, CORS, pipes, Swagger
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema — all models and enums
│   │   │   └── seed.ts           # Development seed data
│   │   ├── jest.config.ts        # Jest unit test configuration
│   │   ├── tsconfig*.json        # TypeScript config for API
│   │   └── eslint.config.mjs     # ESLint flat config for API
│   └── optimizer/                # Python FastAPI — OR-Tools VRP solver
│       ├── main.py               # FastAPI app entrypoint (health + optimization)
│       └── requirements.txt      # Python dependencies (FastAPI, OR-Tools, pytest, ruff, ...)
├── packages/
│   └── contracts/                # Shared TypeScript types/contracts between frontend and backend
├── infra/
│   └── project.json              # Nx run-commands for `infra:up/down/logs` (docker compose)
├── docker-compose.yml            # Full stack local dev (Postgres, Redis, API, optimizer)
├── nx.json                       # Nx workspace configuration (named inputs, target defaults)
├── pnpm-workspace.yaml           # Monorepo package layout (`apps/*`, `packages/*`)
└── docs/
    ├── BACKEND_OVERVIEW.md       # You are here
    ├── FRONTEND_INTEGRATION.md   # How Next.js should call this API
    └── API_QUICK_REFERENCE.md    # Endpoint cheat sheet
```

---

## Module Map

All backend routes live under the global prefix `/api` except `/health`:

- Global prefix: `/api` (see `app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: GET }] })`).
- Health endpoint: `GET /health` (no `/api` prefix).

| Module        | Route Prefix                 | What it does                                                | Auth Required | Roles                    |
|---------------|------------------------------|-------------------------------------------------------------|--------------|--------------------------|
| `auth`        | `/api/auth`                  | Login, refresh token, logout, `me`                         | Mixed        | Public + any authenticated |
| `admin`       | `/api/admin`                 | System health, config, admin users                         | Yes          | `ADMIN`                  |
| `drivers`     | `/api/dispatcher/drivers`    | Create/update/list/soft-delete drivers                     | Yes          | `ADMIN`, `DISPATCHER`    |
| `availability`| `/api/dispatcher/availability` | Driver availability for specific dates                    | Yes          | `ADMIN`, `DISPATCHER`    |
| `tasks`       | `/api/dispatcher/tasks`      | Task CRUD + CSV import                                     | Yes          | `ADMIN`, `DISPATCHER`    |
| `planning`    | `/api/dispatcher/planning`   | Optimization jobs, status, plans, publish                  | Yes          | `ADMIN`, `DISPATCHER`    |
| `geocode`     | `/api/geocode`               | Geocode search via Nominatim with caching                  | No auth now\* | N/A                      |
| `driver-app`  | `/api/driver/...`            | Driver-facing endpoints (route, status updates, etc.)      | Yes          | Driver users (JWT role)  |
| `health`      | `/health`                    | Basic liveness check                                       | No           | N/A                      |

\* Check `GeocodeModule` if you need to lock this down later; currently `GeocodeController` has no `@UseGuards` and is public.

Auth is enforced via:

- `JwtAuthGuard` – validates JWT access token and attaches `AuthenticatedUser`.
- `RolesGuard` + `@Roles(Role.ADMIN, Role.DISPATCHER)` – enforces role-based access on dispatcher/admin modules.

---

## Data Models (Prisma)

Source: `apps/api/prisma/schema.prisma`.

### Core models

- **`User`**
  - **Purpose**: Admin/dispatcher user accounts for logging into the system and owning plans/jobs.
  - **Key fields**: `id`, `email` (unique), `name`, `phone`, `passwordHash`, `role` (`Role` enum), `lastLogin`, `createdAt`.
  - Relations: `refreshTokens`, `plans`, `optimizationJobs`.

- **`RefreshToken`**
  - **Purpose**: Tracks issued refresh tokens for users.
  - **Key fields**: `userId`, `tokenHash` (SHA-256 of token), `expiresAt`, `revokedAt`.
  - Relation: belongs to `User`.

- **`Driver`**
  - **Purpose**: Physical drivers executing routes.
  - **Key fields**: `name`, `phone`, `shiftStart`, `shiftEnd`, `depotLat`, `depotLng`, `capacityUnits?`, `active`, timestamps.
  - Relations: `availability`, `routes`.

- **`Availability`**
  - **Purpose**: Driver availability overrides per date.
  - **Key fields**: `driverId`, `date`, `available`, `shiftStartOverride?`, `shiftEndOverride?`.
  - Constraint: unique on `(driverId, date)`.

- **`Task`**
  - **Purpose**: Atomic pickup/dropoff tasks to be scheduled.
  - **Key fields**:
    - Pickup: `pickupAddress`, `pickupLat`, `pickupLng`, `pickupWindowStart`, `pickupWindowEnd`, `pickupServiceMinutes`.
    - Dropoff: `dropoffAddress`, `dropoffLat`, `dropoffLng`, `dropoffDeadline`, `dropoffServiceMinutes`.
    - Meta: `title`, `priority` (`Priority` enum), `status` (`TaskStatus`), `notes?`, timestamps.
  - Relations: `stops`.

- **`Plan`**
  - **Purpose**: A dated optimization plan grouping routes and jobs.
  - **Key fields**: `date`, `status` (`PlanStatus`), `publishedAt?`, `createdById`.
  - Relations: `createdBy` (`User`), `routes`, `jobs`.

- **`Route`**
  - **Purpose**: A route assigned to a driver within a plan.
  - **Key fields**: `planId`, `driverId`, `totalDistanceM`, `totalTimeS`.
  - Relations: `plan`, `driver`, `stops`.

- **`Stop`**
  - **Purpose**: Individual stops on a route.
  - **Key fields**: `routeId`, `taskId`, `sequence`, `type` (`StopType`), `etaS`, `departureS`, `actualArrivalS?`, `completedAt?`, `notes?`, `status` (`StopStatus`).
  - Relations: `route`, `task`, `stopEvents`.

- **`StopEvent`**
  - **Purpose**: Audit trail of status changes for stops.
  - **Key fields**: `stopId`, `status`, `timestamp`, `notes?`, `createdBy`.
  - Relation: belongs to `Stop`.

- **`OptimizationJob`**
  - **Purpose**: Background optimization jobs kicked off by dispatchers.
  - **Key fields**: `status` (`JobStatus`), `progressPercent`, `startedAt?`, `finishedAt?`, `planId?`, `error?`, `requestSnapshot?`, `resultSnapshot?`, `createdById`.
  - Relations: `createdBy` (`User`), `plan?` (`Plan`).

- **`Config`**
  - **Purpose**: Global configuration row for optimization behavior.
  - **Key fields**: `maxSolveSeconds`, `speedKmh`, `objectiveWeights` (JSON), `updatedAt`.

- **`GeocodeCache`**
  - **Purpose**: Cache of geocoding responses to avoid repeated external calls.
  - **Key fields**: `normalizedQuery` (primary key), `results` (JSON), `expiresAt`.

### Enums

- **`Role`**: `ADMIN`, `DISPATCHER`  
  Used for RBAC in `@Roles` decorators and in user records.

- **`Priority`**: `low`, `normal`, `high`, `urgent`  
  Used on `Task.priority` — frontend can use these for priority badges/filters.

- **`TaskStatus`**: `pending`, `assigned`, `cancelled`  
  Tracks lifecycle of tasks.

- **`PlanStatus`**: `draft`, `published`  
  Determines whether a plan can still be edited or has been published to drivers.

- **`StopType`**: `pickup`, `dropoff`  
  Whether a stop corresponds to the pickup or dropoff leg of a task.

- **`StopStatus`**: `pending`, `arrived`, `done`, `skipped`  
  Used both on stops and stop events.

- **`JobStatus`**: `queued`, `running`, `completed`, `failed`  
  Status of `OptimizationJob` records.

These enums are exported in the generated `@prisma/client` package and can also be mirrored in frontend types (or shared via `packages/contracts`).

---

## Background Jobs & Optimization Lifecycle

The optimization flow is implemented in the `planning` module and backed by the `OptimizationJob` Prisma model.

### Lifecycle

1. **Queue optimization**
   - Endpoint: `POST /api/dispatcher/planning/optimize`
   - Controller: `PlanningController.optimize`
   - Request body: `OptimizeDto` (includes date and config flags).
   - Side effects:
     - Creates an `OptimizationJob` row with `status = queued` and `createdById` from the authenticated user.
     - Enqueues a BullMQ job for the Python optimizer (`apps/api/src/planning/optimization.queue.ts` and `optimization.worker.ts`).
   - Response (unwrapped by client): an object containing at least `jobId` (the `OptimizationJob.id`) and current job status metadata.

2. **Background processing**
   - Worker: `apps/api/src/planning/optimization.worker.ts`.
   - Responsibilities:
     - Calls the optimizer service in `apps/optimizer` using `OPTIMIZER_URL`.
     - Builds a `Plan` + `Route` + `Stop` graph based on optimization output.
     - Updates `OptimizationJob.status`:
       - `running` when work starts
       - `completed` on success, with `planId` set to the generated `Plan.id`
       - `failed` on errors, with `error` populated.
     - Updates `progressPercent`, `startedAt`, `finishedAt`, and snapshot JSON fields.

3. **Poll optimization status**
   - Endpoint: `GET /api/dispatcher/planning/status/:jobId`
   - Controller: `PlanningController.status`
   - Returns: a `PlanningJobStatusResponse` with fields like:
     - `jobId`
     - `status` (`queued` \| `running` \| `completed` \| `failed`)
     - `progressPercent`
     - `planId` (present when `status === 'completed'`)
     - `error` (details when `status === 'failed'`)
   - **Frontend behavior**: poll this endpoint until `status` is either `completed` or `failed`.

4. **Fetch plan details**
   - Endpoint: `GET /api/dispatcher/planning/plans/:planId`
   - Controller: `PlanningController.plan`
   - Returns: `PlanDetailsResponse`:
     - Plan metadata: id, date, status, stats.
     - Routes: per-driver route summaries with stops and tasks.
     - Unassigned tasks and reasons.

5. **List plans / publish**
   - List: `GET /api/dispatcher/planning/plans`
   - Publish: `POST /api/dispatcher/planning/plans/:planId/publish`
   - Publishing transitions a draft plan to `published` and may trigger driver notifications.

---

## Environment & Ports

Source: `.env.example`, `apps/api/src/main.ts`, `docker-compose.yml`.

- **API port**: `API_PORT` (default `3001` in `.env.example`).
- **Database**:
  - `DATABASE_URL=postgresql://dispatch:dispatch@postgres:5432/dispatch_dev`
  - In Docker, Postgres is exposed on host `localhost:5433` → container `5432`.
- **Redis**:
  - `REDIS_URL=redis://redis:6379`
- **JWT**:
  - `JWT_SECRET`
  - `JWT_ACCESS_EXPIRES_IN` (e.g. `15m`)
  - `JWT_REFRESH_EXPIRES_IN` (e.g. `7d`)
- **Optimizer**:
  - `OPTIMIZER_URL=http://optimizer:8000` (used by planning worker inside Docker)
- **Geocoding**:
  - `NOMINATIM_URL=https://nominatim.openstreetmap.org`

Docker services (`docker-compose.yml`):

- `postgres`: `postgres:16-alpine`, mapped port `5433:5432`.
- `redis`: `redis:7-alpine`.
- `api`: built from `apps/api/Dockerfile`, mapped `3001:3001`, healthcheck `GET http://localhost:3001/health`.
- `optimizer`: built from `apps/optimizer`, mapped `8000:8000`, healthcheck `GET http://localhost:8000/health`.

---

## Nx Targets for the API

Source: `apps/api/project.json`.

All targets delegate to the original npm scripts via `nx:run-commands`:

- `nx run api:serve` → `pnpm --filter api start:dev`
- `nx run api:build` → `pnpm --filter api build`
- `nx run api:test` → `pnpm --filter api test`
- `nx run api:test:e2e` → `pnpm --filter api test:e2e`
- `nx run api:lint` → `pnpm --filter api lint`
- `nx run api:typecheck` → `pnpm --filter api typecheck`

Use these via Nx from the repo root for a consistent workflow.***
