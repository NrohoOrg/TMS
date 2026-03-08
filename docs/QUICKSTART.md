# TMS Backend Quick Start Guide

This guide explains how to start the backend and database to test API endpoints after opening VS Code.

## Prerequisites

- Node.js installed (verify with `node --version`)
- Docker Desktop installed and running
- VS Code REST Client extension (`ms-vscode.rest-client`)

---

## Step-by-Step Commands

Open a **PowerShell terminal** in VS Code (Terminal → New Terminal) and run these commands:

### Step 1: Refresh PATH (Required in new terminals)

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Step 2: Start Docker Desktop

If Docker Desktop is not running, start it:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Wait about 30 seconds for Docker to initialize, then verify:

```powershell
docker --version
```

### Step 3: Start Database & Redis

Navigate to project root and start infrastructure:

```powershell
cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS
docker compose up -d postgres redis
```

Verify containers are running:

```powershell
docker ps
```

You should see `tms-postgres-1` and `tms-redis-1` with status "healthy".

### Step 4: Set Environment Variables

```powershell
$env:DATABASE_URL = "postgresql://dispatch:dispatch@localhost:5433/dispatch_dev"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "changeme_jwt_secret_dev"
$env:API_PORT = "3001"
$env:OPTIMIZER_URL = "http://localhost:8000"
$env:NOMINATIM_URL = "https://nominatim.openstreetmap.org"
```

### Step 5: Start the API Server

```powershell
cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS\apps\api
node dist/apps/api/src/main.js
```

The server will start on port 3001. Logs are output as JSON (pino logger) — if the server started successfully you will see a line containing `"Nest application successfully started"` in the output.

### Step 6: Test the API

Open `test.rest` in VS Code and click "Send Request" on the Health Check:

```
GET http://localhost:3001/health
```

Expected response:
```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

---

## One-Liner Commands (Copy & Paste)

### Start Everything (Database + API)

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS; docker compose up -d postgres redis; Start-Sleep -Seconds 10; cd apps\api; $env:DATABASE_URL = "postgresql://dispatch:dispatch@localhost:5433/dispatch_dev"; $env:REDIS_URL = "redis://localhost:6379"; $env:JWT_SECRET = "changeme_jwt_secret_dev"; $env:API_PORT = "3001"; $env:OPTIMIZER_URL = "http://localhost:8000"; $env:NOMINATIM_URL = "https://nominatim.openstreetmap.org"; node dist/apps/api/src/main.js
```

### Stop Everything

```powershell
cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS; docker compose down
```

---

## Testing Endpoints

1. Open `test.rest` file
2. Run the **Login** request first:
   ```
   POST http://localhost:3001/api/auth/login
   ```
   With body:
   ```json
   {
     "email": "admin@example.com",
     "password": "Admin1234!"
   }
   ```
3. From the response, copy the `token` value and replace `YOUR_ACCESS_TOKEN_HERE` on **line 17** of `test.rest`
4. Copy the `refreshToken` value and replace `YOUR_REFRESH_TOKEN_HERE` on **line 18** of `test.rest`
5. Test other endpoints

---

## Seeded Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin1234! | ADMIN |
| dispatcher@example.com | Dispatch1234! | DISPATCHER |

---

## Troubleshooting

### "node is not recognized"
Run the PATH refresh command:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### "Cannot find module dist/apps/api/src/main.js"
Rebuild the API:
```powershell
cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS\apps\api
npx nest build
```

### "EADDRINUSE: address already in use :::3001"
The API is already running. Check other terminals or kill the process:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Database connection error
Make sure Docker containers are running:
```powershell
docker ps
```

If not running:
```powershell
docker compose up -d postgres redis
```

### Need to reset the database
```powershell
cd C:\Users\badri\OneDrive\Desktop\Nroho-Dev\TMS\apps\api
$env:DATABASE_URL = "postgresql://dispatch:dispatch@localhost:5433/dispatch_dev"
npx prisma migrate reset --force
```

---

## Ports Reference

| Service | Port |
|---------|------|
| API | 3001 |
| PostgreSQL | 5433 |
| Redis | 6379 |
| Swagger Docs | http://localhost:3001/api/docs |
