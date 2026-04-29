# Hosting Preparation

How to ship the TMS to production on **Djezzy Cloud** with **data residency in Algeria**.

---

## 1. Stack snapshot

What runs at runtime:

| Service          | Tech              | Port | Memory      | Notes                          |
|------------------|-------------------|------|-------------|--------------------------------|
| Postgres         | Postgres 16       | 5432 | 512MB–2GB   | Holds all task / plan data.    |
| Redis            | Redis 7           | 6379 | 128MB       | Queue + rate-limit slots.      |
| NestJS API       | Node              | 3001 | 300–600MB   | Business logic + auth.         |
| Python optimizer | FastAPI + OR-Tools| 8000 | 300–800MB   | Spiky CPU during solves.       |
| Next.js frontend | Node              | 3000 | 200–400MB   | Mostly static after `build`.   |

External dependencies: **Google Places API** (autocomplete + details — outbound HTTPS only). No other third-party calls.

For the target scale (1–2 dispatchers, 5–10 drivers, ~50 tasks/day) the entire stack fits on **one VM**. Splitting earlier than necessary buys complexity, not reliability.

---

## 2. Recommended topology

```
┌──── Djezzy Cloud (Algiers datacenter) ─────────────────┐
│                                                          │
│  Single Linux VM — Ubuntu 22.04                          │
│  4 vCPU · 8 GB RAM · 100 GB SSD                          │
│                                                          │
│  ┌──── Caddy (reverse proxy + auto-HTTPS) ──────────┐    │
│  │  tms.yourco.dz   → frontend container (3000)     │    │
│  │  api.yourco.dz   → api container (3001)          │    │
│  └───────────────┬───────────────────────────────────┘    │
│                  │                                        │
│  Docker Compose:                                          │
│   - postgres (volume on VM disk, data residency ✓)        │
│   - redis                                                 │
│   - api                                                   │
│   - optimizer                                             │
│   - frontend                                              │
└──────────────────────────────────────────────────────────┘
       ↑ HTTPS                                ↓ HTTPS
  Dispatchers' browsers           Google Places API (outbound)
```

**Why one VM**: simpler ops, fastest DB queries (no network hop), single TLS cert, one backup target. Vertical scale first; split horizontally only if it actually hurts.

---

## 3. Data residency check

| Data                       | Where it lives                           |
|----------------------------|------------------------------------------|
| Tasks, plans, drivers, users | Postgres on the Djezzy VM disk         |
| Geocode cache              | Postgres on the Djezzy VM disk           |
| Refresh tokens / sessions  | Postgres on the Djezzy VM disk           |
| Logs                       | VM disk (rotate weekly)                  |
| Outbound to Google Places  | Query string only — no PII; Google's TOS allows this for autocomplete |

Nothing customer-identifying ever crosses the border.

---

## 4. What's already in the repo

- `apps/api/Dockerfile` — production-ready Node build.
- `apps/optimizer/Dockerfile` — Python + OR-Tools.
- `docker-compose.yml` — wires Postgres, Redis, API, Optimizer for local dev.
- `.env.example` — env-var template.

## 5. What's missing for production deploy

Three small files. Roughly 50 lines total.

1. **`apps/frontend/Dockerfile`** — multi-stage Node build that runs `next build` and serves with `next start`.
2. **`docker-compose.prod.yml`** — overlay file that:
   - Adds `restart: unless-stopped` to every service.
   - Removes the dev `ports:` mappings (so only Caddy is publicly exposed).
   - Adds the new `frontend` service.
   - Adds a `caddy` service with two volumes (`caddy_data`, `caddy_config`) for cert persistence.
3. **`Caddyfile`** — three blocks:
   - `tms.yourco.dz { reverse_proxy frontend:3000 }`
   - `api.yourco.dz { reverse_proxy api:3001 }`
   - `(common) { encode gzip; … }` for shared headers.

Once those are in place, deployment on the VM is one command:

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 6. Backup & recovery

| What                       | How                                                                 | How often |
|----------------------------|---------------------------------------------------------------------|-----------|
| Postgres logical dump      | `pg_dump --format=custom > /backups/db-$(date +%F).dump` via cron   | Daily     |
| Off-VM copy of dump        | rsync / rclone / S3-compatible upload to Djezzy object storage      | Daily     |
| VM-level snapshot          | Whatever Djezzy provides (weekly is enough)                         | Weekly    |
| Geocode cache              | Not backed up — regenerable from Google                             | —         |
| Restore drill              | Re-load most recent dump on a sandbox VM, run smoke tests           | Quarterly |

Restore command (sanity-tested):
```bash
pg_restore --clean --create --dbname=postgres /backups/db-YYYY-MM-DD.dump
```

---

## 7. Networking & TLS

- **DNS**: A records for `tms.yourco.dz` and `api.yourco.dz` → VM public IP.
- **Firewall**: open **80** (Let's Encrypt HTTP-01 challenge) + **443** (HTTPS). Block everything else, including direct access to 3001 / 5432 / 6379 / 8000.
- **TLS**: Caddy auto-issues + auto-renews via Let's Encrypt. No manual cert work.
- **CORS**: API only accepts requests from `tms.yourco.dz`. Configure the `CORS_ORIGIN` env var.

---

## 8. Secrets & env vars

Server-side `.env` on the VM (never in git):

```
DATABASE_URL=postgresql://dispatch:<strong-password>@postgres:5432/dispatch
REDIS_URL=redis://redis:6379

JWT_SECRET=<openssl rand -hex 64>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_MAPS_API_KEY=<the Places key>
GOOGLE_MAPS_AUTOCOMPLETE_BASE_URL=https://maps.googleapis.com/maps/api/place/autocomplete/json
GOOGLE_MAPS_DETAILS_BASE_URL=https://maps.googleapis.com/maps/api/place/details/json

NODE_ENV=production
```

**Google Places key hardening** (Cloud Console → Credentials → API key → Restrictions):
- HTTP referrer restriction: only `tms.yourco.dz/*` (and `localhost:3000/*` for dev).
- API restriction: only **Places API**.
- Daily budget alert: ~10 USD with email alerts.

The key never reaches the browser — it's used only by the NestJS server when it calls Places. Referrer restriction is defense-in-depth.

---

## 9. Estimated cost

Indicative ranges; confirm with Djezzy's actual rates:

| Resource                              | Monthly DZD (est.) |
|---------------------------------------|--------------------|
| 4 vCPU / 8 GB RAM / 100 GB SSD VM     | 5,000–15,000       |
| 100 GB object storage (backups)       | 500–2,000          |
| Outbound traffic (Google API)         | <500               |
| Domain `.dz` (annual / 12)            | ~500               |
| Google Places (1k searches/month)     | Free tier covers it |

Budget alert at **1.5×** the expected total.

---

## 10. Initial deploy — step by step

After provisioning the VM and pointing DNS:

```bash
# 1. SSH in
ssh ubuntu@<VM_IP>

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Clone the repo
git clone <repo-url> tms
cd tms

# 4. Create the .env file from .env.example, fill in real secrets
cp .env.example .env
nano .env

# 5. First-time build + run
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 6. Run the migrations
docker compose exec api npx prisma migrate deploy

# 7. (Optional) seed initial users / config
docker compose exec api node prisma/seed.js   # or pnpm db:seed if scripted

# 8. Verify
curl -I https://tms.yourco.dz
curl -I https://api.yourco.dz/api/health

# 9. Set up the daily backup cron
sudo crontab -e
# 0 3 * * * docker compose exec -T postgres pg_dump -U dispatch dispatch_dev | gzip > /backups/db-$(date +\%F).sql.gz
```

Subsequent deploys:
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api npx prisma migrate deploy   # only when migrations change
```

---

## 11. Operational hygiene

- **Logs**: `docker compose logs -f api optimizer` for live tailing. Add log rotation in `docker-compose.prod.yml` (`logging: { driver: json-file, options: { max-size: 10m, max-file: 5 } }`).
- **Health checks**: existing `/health` endpoints on API + Optimizer + Frontend (`/`). Hook them up to a free uptime monitor (UptimeRobot, etc.) hitting from outside.
- **Secrets rotation**: rotate `JWT_SECRET` annually (forces all users to re-login) and the Google Places key when convenient.
- **Updates**: monthly `apt update && apt upgrade` on the VM. Quarterly Docker base-image refresh by rebuilding the images.

---

## 12. When to outgrow one VM

Move to multi-tier when **any** of these hits:

- Postgres CPU consistently >70% during business hours.
- Optimizer solves regularly time out at the configured `maxSolveSeconds`.
- Memory usage keeps the VM swapping.
- More than ~20 concurrent dispatcher sessions.

Migration path (smooth, no code change):
1. Move Postgres to a managed Postgres instance (Djezzy or another Algerian provider) — keep the same connection string in `.env`.
2. Move Redis to a managed Redis (or just keep it on the VM, it's tiny).
3. Run multiple API replicas behind Caddy if the API becomes the bottleneck (the optimizer is the more likely first to need scaling — it's CPU-bound).
4. Eventually, run the optimizer on a separate VM with more cores.

None of this requires re-architecting; it's all knob-turning at the compose / DNS layer.

---

## 13. Open questions for the Djezzy account

To finalize the plan, confirm:

1. Does the account expose **plain Linux VMs** (IaaS) — Ubuntu 22.04 LTS at minimum?
2. Is there a **managed Postgres** option? If yes, prefer it — they handle patches and PITR.
3. Is there **S3-compatible object storage** for backups?
4. Pricing breakpoint — sometimes 4 vCPU costs much more than 2× the price of 2 vCPU. Worth knowing before sizing.
5. Outbound internet — confirm not blocked by default (needed for Google Places + npm/pip during builds).
6. **VM snapshots** — does the platform offer scheduled snapshots? Any included quota?
7. Native firewall / security groups — yes/no.

Once those are answered, the plan locks down to either:
- **Path A (IaaS only)**: single VM with the compose stack + nightly pg_dump uploaded to object storage.
- **Path B (managed Postgres available)**: same VM minus the postgres container; `DATABASE_URL` points at the managed DB.

Both paths keep all data inside Algeria.
