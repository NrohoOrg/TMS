# TMS Monorepo

This is the Nx-based monorepo for the TMS project.

- Frontend (Next.js): `apps/frontend`
- Backend API (NestJS + Prisma + PostgreSQL + Redis): `apps/api`
- Optimizer service (FastAPI + OR-Tools): `apps/optimizer`
- Shared packages (types/contracts/etc.): `packages/*`
- Local infra helper (Docker compose wrapper): `infra`

All commands below assume you are in the repo root: `TMS/`.

---

## Documentation

| Doc | What's in it |
|-----|--------------|
| [Backend Overview](docs/BACKEND_OVERVIEW.md) | Architecture, module map, data models, optimization lifecycle |
| [Frontend Integration Guide](docs/FRONTEND_INTEGRATION.md) | Local setup, API client, auth flow, key workflows |
| [API Quick Reference](docs/API_QUICK_REFERENCE.md) | Fast endpoint cheat sheet for common calls |
| [Swagger UI](http://localhost:3001/api/docs) | Full interactive API docs (run backend first) |

---

## Project structure

- `apps/frontend` – Next.js 16 app for all UI (admin, dispatcher, driver)
- `apps/api` – NestJS 10 API, talks to Postgres + Redis and the optimizer
- `apps/optimizer` – FastAPI service exposing optimization endpoints
- `packages/contracts` – shared TypeScript contracts used by API/frontend
- `infra` – Nx project wrapping `docker compose` for Postgres + Redis only
- `.github/workflows/ci.yml` – Nx-aware CI (lint / typecheck / test / build)

---

## Ports & URLs

- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost:3001`
  - Health: `http://localhost:3001/health`
  - Swagger: `http://localhost:3001/api/docs`
- **Optimizer**: `http://localhost:8000`
- **Postgres** (host port → container): `5433 → 5432`
- **Redis**: `6379`

The frontend should call the API at `http://localhost:3001/api/...` in local dev.

---

## Environment configuration

The root `.env.example` combines frontend + backend variables. Copy it and adjust as needed:

```bash
cp .env.example .env
```

Key backend variables:

- `DATABASE_URL` – Postgres connection string (used by Prisma)
- `REDIS_URL` – Redis connection string
- `API_PORT` – API port (default 3001)
- `OPTIMIZER_URL` – URL the API uses to reach the optimizer (default `http://optimizer:8000` in Docker)
- `NODE_ENV` – `development`/`production`

For local Nx dev, API listens on port 3001 regardless of Docker.

---

## Installing dependencies

From the repo root:

```bash
pnpm install
pip install -r apps/optimizer/requirements.txt
```

Prisma client for the API is generated via:

```bash
pnpm --filter api prisma generate
```

You normally only need this after changing the Prisma schema.

---

## Backend Development

### Option A — Nx local dev (recommended)

Prerequisites: Node 20, pnpm 9, Python 3.11, Docker (for infra only)

```bash
# 1. Install dependencies
pnpm install
pip install -r apps/optimizer/requirements.txt

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Start infrastructure (postgres + redis only)
nx run infra:up

# 4. Run database migrations + seed
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed

# 5. Start backend services
nx run api:serve        # http://localhost:3001
nx run optimizer:serve  # http://localhost:8000

# Or both at once (two terminals, or use & in one)
nx run-many -t serve --projects=api,optimizer --parallel
```

Useful Nx backend targets:

- `nx run api:build` – build Nest API (`pnpm --filter api build`)
- `nx run api:test` – run API unit tests (Jest)
- `nx run api:typecheck` – API typecheck (`tsc --noEmit`)
- `nx run api:lint` – API lint (`eslint "{src,test}/**/*.ts"`)
- `nx run optimizer:test` – optimizer tests (pytest)
- `nx run optimizer:lint` – optimizer lint (ruff)

### Option B — Full Docker dev

```bash
cp .env.example .env
docker compose up -d
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
```

This brings up:

- Postgres + Redis
- API on port 3001 (container + host mapping `3001:3001`)
- Optimizer on port 8000

---

## Frontend Development (summary)

The frontend lives in `apps/frontend` and is currently managed as a standalone Next.js app.
High-level workflow (see `DEPLOYMENT.md` for full details):

```bash
cd apps/frontend
pnpm install        # or npm install if you prefer
pnpm dev            # http://localhost:3000
pnpm lint
pnpm build
```

Frontend deployment to Vercel uses `apps/frontend` as the root directory. See `DEPLOYMENT.md`
for step-by-step deploy + troubleshooting instructions.

---

## CI overview

GitHub Actions workflow: `.github/workflows/ci.yml`

Jobs:

- **install** – installs pnpm dependencies and sets Nx SHAs
- **lint-typecheck** – `pnpm nx affected -t lint typecheck`
- **unit-tests** – `pnpm nx affected -t test` plus `pip install` for optimizer
- **integration-tests** – spins up Postgres + Redis services, runs Prisma migrations, then `nx run api:test:e2e`
- **build** – `pnpm nx affected -t build`

---

## Troubleshooting

- **Prisma types missing / TS errors**  
  Run `pnpm --filter api prisma generate` from the repo root, then `nx run api:typecheck`.

- **Postgres/Redis not reachable in local dev**  
  Ensure `nx run infra:up` succeeded and check `docker compose ps`. Postgres should be
  listening on `localhost:5433`, Redis on `localhost:6379`.

- **Optimizer health check failing**  
  Check `nx run optimizer:serve` logs or the optimizer container logs if running via Docker.
  Health endpoint is `GET http://localhost:8000/health`.

