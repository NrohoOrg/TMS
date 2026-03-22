# TMS Backend Quick Start Guide

Fast setup guide to run the TMS backend, database, and API server.

## Prerequisites

- Node.js installed
- Docker Desktop installed and running
- VS Code REST Client extension (`ms-vscode.rest-client`)

---

## ⚡ Quick Start Steps

Follow these steps in order to get the backend running:

| # | Step | Command |
|---|------|---------|
| **1** | **Start Docker containers** (PostgreSQL + Redis) | `docker compose up -d postgres redis` |
| **2** | **Verify containers are running** | `docker ps` |
| **3** | **Install dependencies** | `pnpm install` |
| **4** | **Start the API server** (runs on port 3001) | `cd apps/api && export DATABASE_URL="postgresql://dispatch:dispatch@localhost:5433/dispatch_dev" && export REDIS_URL="redis://localhost:6379" && export JWT_SECRET="changeme_jwt_secret_dev" && export API_PORT="3001" && export OPTIMIZER_URL="http://localhost:8000" && export NOMINATIM_URL="https://nominatim.openstreetmap.org" && node dist/apps/api/src/main.js` |
| **5** | **Test the API** | Open `test.rest` and click "Send Request" on the **Login** endpoint |

---

## 🔑 Test Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin1234! | ADMIN |
| dispatcher@example.com | Dispatch1234! | DISPATCHER |

---

## 📋 Copy-Paste One-Liner (Start Everything)

```bash
docker compose up -d postgres redis && sleep 5 && pnpm install && cd apps/api && export DATABASE_URL="postgresql://dispatch:dispatch@localhost:5433/dispatch_dev" && export REDIS_URL="redis://localhost:6379" && export JWT_SECRET="changeme_jwt_secret_dev" && export API_PORT="3001" && export OPTIMIZER_URL="http://localhost:8000" && export NOMINATIM_URL="https://nominatim.openstreetmap.org" && node dist/apps/api/src/main.js
```

---

## 🛑 Stop Everything

```bash
docker compose down
```

---

## 🧪 Testing the API

1. Open `test.rest` in VS Code
2. Click "Send Request" on the **Login** endpoint
3. Copy the `token` from the response
4. Replace `YOUR_ACCESS_TOKEN_HERE` on line 17 of `test.rest`
5. Replace `YOUR_REFRESH_TOKEN_HERE` on line 18 of `test.rest`
6. Test any other endpoint

---

## 📡 Available Services

| Service | Port | URL |
|---------|------|-----|
| API | 3001 | http://localhost:3001 |
| PostgreSQL | 5433 | localhost:5433 |
| Redis | 6379 | localhost:6379 |
| Swagger Docs | 3001 | http://localhost:3001/api/docs |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Containers not running | Run: `docker compose up -d postgres redis` |
| API won't start | Run: `npx nx build api` then retry step 4 |
| Port 3001 already in use | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| Database connection error | Check Docker containers with `docker ps` |
| Need to reset database | Run: `cd apps/api && npx prisma migrate reset --force` |
