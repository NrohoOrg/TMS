# TMS Local Run Guide

End-to-end steps to bring up Postgres + Redis, the optimizer (FastAPI + OR-Tools), the backend API (NestJS), and the frontend (Next.js) on macOS.

All commands assume you are at the repo root: `TMS/`.

---

## 0. Prerequisites (one-time, machine-level)

- Node 20, pnpm 9+
- Python 3.11 (the project requires 3.11; macOS default `python3` is too old)
- Docker runtime — on this machine via Colima
- `pip` packages: `fastapi`, `uvicorn`, `httpx`, `pydantic`, `ortools`, `protobuf>=5`

If you are starting from a fresh clone, run the one-time setup in section 1 once. On every later session, skip to section 2.

---

## 1. One-time setup (first clone, or after dependency changes)

### 1.1 Install JS dependencies

```bash
pnpm install
pnpm --filter frontend install   # frontend has its own lockfile; install separately
```

### 1.2 Install Python dependencies for the optimizer

The pinned `apps/optimizer/requirements.txt` has versions that don't resolve on this Python build. Install compatible versions instead:

```bash
python3.11 -m pip install "fastapi>=0.111.0" "uvicorn[standard]>=0.29.0" "httpx>=0.27.0"
python3.11 -m pip install --upgrade "protobuf>=5.0"
```

`pydantic` and `ortools` should already be present in the conda Python 3.11 env. Verify:

```bash
python3.11 -c "import fastapi, uvicorn, ortools, pydantic; print('ok')"
```

### 1.3 Configure `.env` for **local** dev (not Docker hostnames)

The repo's default `.env` points at Docker service names. For local Nx dev, the API/optimizer must reach Postgres/Redis on `localhost`. Make sure `.env` contains:

```env
DATABASE_URL=postgresql://dispatch:dispatch@localhost:5433/dispatch_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=changeme_jwt_secret_dev
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_PORT=3001
OPTIMIZER_URL=http://localhost:8000
NOMINATIM_URL=https://nominatim.openstreetmap.org
NODE_ENV=development
```

### 1.4 Generate Prisma client, migrate, seed

```bash
pnpm --filter api prisma generate
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
```

Seed creates these users:
- Admin: `admin@example.com` / `Admin1234!`
- Dispatcher: `dispatcher@example.com` / `Dispatch1234!`

---

## 2. Daily run (every time you re-open the repo)

Open **four terminals** at the repo root.

### Terminal 1 — Docker + infra (Postgres + Redis)

```bash
colima start                # start the Docker daemon (skip if already running)
export PATH="$HOME/.npm-global/bin:$PATH"                                                                                                                                 
                                                                                                                                                                            
  Then verify and start infra:                                                                                                                                              
                                                                                                                                                                            
  which pnpm                                                                                                                                                                
pnpm nx run infra:up        # boots tms-postgres-1 and tms-redis-1
```

Verify:
```bash
docker ps                              # should show postgres + redis
```

> If Postgres data was wiped (e.g. you removed the volume), re-run `pnpm --filter api prisma migrate deploy && pnpm --filter api prisma db seed`.

### Terminal 2 — Optimizer (FastAPI on :8000)

```bash
cd apps/optimizer
python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:
```bash
curl http://localhost:8000/health
# {"status":"ok","service":"optimizer"}
```

### Terminal 3 — Backend API (NestJS on :3001)

```bash
pnpm nx run api:serve
```

Verify (give it ~15s to compile):
```bash
curl http://localhost:3001/health
# {"success":true,"data":{"status":"ok","timestamp":"..."}}
```

Swagger UI: http://localhost:3001/api/docs

### Terminal 4 — Frontend (Next.js on :3000)

```bash
cd apps/frontend
pnpm dev
```

Open http://localhost:3000 — log in with the seeded credentials above.

> If port 3000 is already taken by another process, Next.js automatically falls back to **3002**. Check the terminal output for the actual URL. To free 3000:
> ```bash
> lsof -ti :3000 | xargs kill
> ```

---

## 3. Smoke test the optimizer directly

```bash
curl -s -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "smoke-1",
    "config": {"maxSolveSeconds": 5, "speedKmh": 40, "returnToDepot": false},
    "drivers": [
      {"id": "d1", "shiftStartS": 28800, "shiftEndS": 64800, "depotLat": 36.7538, "depotLng": 3.0588, "capacityUnits": 10},
      {"id": "d2", "shiftStartS": 28800, "shiftEndS": 64800, "depotLat": 36.7755, "depotLng": 3.0594, "capacityUnits": 10}
    ],
    "tasks": [
      {"id": "t1", "priority": "high",   "pickupLat": 36.7600, "pickupLng": 3.0500, "pickupWindowStartS": 30000, "pickupWindowEndS": 40000, "pickupServiceS": 300, "dropoffLat": 36.7700, "dropoffLng": 3.0700, "dropoffDeadlineS": 50000, "dropoffServiceS": 300, "capacityUnits": 1},
      {"id": "t2", "priority": "urgent", "pickupLat": 36.7650, "pickupLng": 3.0550, "pickupWindowStartS": 31000, "pickupWindowEndS": 42000, "pickupServiceS": 300, "dropoffLat": 36.7800, "dropoffLng": 3.0800, "dropoffDeadlineS": 55000, "dropoffServiceS": 300, "capacityUnits": 1},
      {"id": "t3", "priority": "normal", "pickupLat": 36.7400, "pickupLng": 3.0400, "pickupWindowStartS": 32000, "pickupWindowEndS": 45000, "pickupServiceS": 300, "dropoffLat": 36.7300, "dropoffLng": 3.0300, "dropoffDeadlineS": 58000, "dropoffServiceS": 300, "capacityUnits": 1}
    ]
  }' | python3 -m json.tool
```

A healthy response has `"status":"completed"`, populated `routes`, and `"unassigned": []`.

---

## 4. Ports cheat sheet

| Service      | URL / Port                            |
|--------------|---------------------------------------|
| Frontend     | http://localhost:3000 (or 3002)       |
| API          | http://localhost:3001                 |
| Swagger      | http://localhost:3001/api/docs        |
| Optimizer    | http://localhost:8000                 |
| Postgres     | localhost:5433 → container 5432       |
| Redis        | localhost:6379                        |

---

## 5. Shutdown

```bash
# Ctrl+C in each terminal, then:
pnpm nx run infra:down       # stop postgres + redis containers
colima stop                  # stop the Docker daemon (optional)
```

---

## 6. Viewing the database

### 6.1 Prisma Studio (recommended GUI)

From the repo root:

```bash
pnpm --filter api prisma studio
```

Opens a web UI at **http://localhost:5555** — browse and edit every table (User, Driver, Task, OptimizationJob, Plan, Route, Stop, Availability, …).

### 6.2 psql

```bash
psql postgresql://dispatch:dispatch@localhost:5433/dispatch_dev
# inside psql:  \dt          list tables
#               SELECT id, title, status, priority FROM "Task" LIMIT 20;
```

Or connect through the running container (no local psql needed):

```bash
docker exec -it tms-postgres-1 psql -U dispatch -d dispatch_dev
```

### 6.3 GUI clients (TablePlus / DBeaver / pgAdmin)

Connection settings:
- Host: `localhost`
- Port: `5433`
- Database: `dispatch_dev`
- User: `dispatch`
- Password: `dispatch`

### 6.4 If `pnpm: command not found`

`pnpm` lives at `~/.npm-global/bin/pnpm`. New terminals may not have it on PATH. Pick one:

**Use the full path once:**
```bash
/Users/mac/.npm-global/bin/pnpm --filter api prisma studio
```

**Export for the current terminal only:**
```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

**Persist for every new terminal** (bash):
```bash
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```
For zsh users, append to `~/.zshrc` instead.

---

## 7. Troubleshooting

**API: `Can't reach database server at postgres:5432`**
Your `.env` is using Docker hostnames. Switch to the localhost values in section 1.3.

**Frontend: `Module not found: Can't resolve '@tanstack/react-query-devtools'` (or any other declared package)**
The frontend has its own lockfile. Run `pnpm --filter frontend install` (or `cd apps/frontend && pnpm install`).

**Optimizer: `ImportError: cannot import name 'runtime_version' from 'google.protobuf'`**
Your protobuf is too old for the installed `ortools`. Run `python3.11 -m pip install --upgrade "protobuf>=5.0"`.

**Optimizer: `Could not find a version that satisfies the requirement pydantic-core==2.18.2`**
Don't `pip install -r apps/optimizer/requirements.txt` — the pins don't resolve on this Python. Use the unpinned install in section 1.2.

**Postgres/Redis not reachable**
`docker ps` should show `tms-postgres-1` and `tms-redis-1`. If not, run `colima start` then `pnpm nx run infra:up`.

**Frontend lands on port 3002 instead of 3000**
Another process holds 3000. Either accept 3002 or run `lsof -ti :3000 | xargs kill` and restart `pnpm dev`.

**Optimizer: `The column 'locked' does not exist` (or any other "column does not exist" Prisma error)**
The `schema.prisma` is ahead of the committed migrations, so the DB is missing columns/constraints. Just re-run `prisma db push --accept-data-loss` if it ever happens again:
```bash
export DATABASE_URL=postgresql://dispatch:dispatch@localhost:5433/dispatch_dev
pnpm --filter api exec prisma db push --accept-data-loss
```
