# TMS Deployment

## Architecture

- **Hosting:** self-hosted on `nroho.dz` (129.45.84.61)
- **Frontend:** `https://tms.nroho.dz` — Next.js standalone, container `tms_web`
- **API:** `https://api.tms.nroho.dz` — NestJS, container `tms_api`
- **Optimizer:** `https://api.tms.nroho.dz/optimizer/` — FastAPI + OR-Tools, container `tms_optimizer`
- **Database:** Postgres 16 in container `tms_postgres` (internal-only, persistent volume)
- **Cache:** Redis 7 in container `tms_redis` (internal-only)
- **Reverse proxy:** existing `nroho/nroho-nginx` container in `/root/server/`

## Networks

- `tms_internal` — postgres, redis, api, optimizer, web (private)
- `server_app_network` — bridge into the existing nginx container so it can proxy to TMS services by name. Created by the nginx stack; deploy.sh refuses to run if it doesn't exist.

## Deployment trigger

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Build + push three images to GHCR (`tms-api`, `tms-optimizer`, `tms-web`), tagged with the short SHA and `latest`.
2. SCP `docker-compose.prod.yml`, the deploy script, and the two nginx site configs to `/opt/tms/staging/` on the server.
3. SSH and run `deploy.sh` which: verifies `server_app_network` exists, pulls images, copies nginx configs into the existing reverse-proxy structure, runs `nginx -t`, reloads nginx, restarts the TMS stack with `docker compose up -d`, waits for health checks.
4. Smoke-test from GitHub Actions via curl.

## Manual operations on the server

```bash
# Tail all TMS logs
cd /opt/tms && docker compose -p tms -f docker-compose.prod.yml logs -f

# Tail specific service
docker logs -f tms_api

# Open a Prisma shell
docker exec -it tms_api sh -c "cd apps/api && pnpm exec prisma studio"

# Manual migration
docker exec tms_api sh -c "cd apps/api && pnpm exec prisma migrate deploy"

# Rollback to a specific SHA
SHA=abc1234 docker pull ghcr.io/nrohoorg/tms-api:$SHA
# ... edit /opt/tms/docker-compose.prod.yml to pin that tag, then up -d

# Database backup
docker exec tms_postgres pg_dump -U tms tms_prod | gzip > /opt/tms/backups/tms_$(date +%F).sql.gz
```

## TLS certificates

Issued via `certbot` against the existing `server_certbot_certs` and `server_certbot_data` volumes. Single SAN cert covers both `tms.nroho.dz` and `api.tms.nroho.dz`. Renewal must be configured separately.

## Files

- [Dockerfile (api, prod)](../apps/api/Dockerfile.prod)
- [Dockerfile (frontend)](../apps/frontend/Dockerfile)
- [docker-compose.prod.yml](../docker-compose.prod.yml)
- [Workflow](../.github/workflows/deploy.yml)
- [Nginx — frontend](nginx/tms.nroho.dz-https.conf)
- [Nginx — api](nginx/api.tms.nroho.dz-https.conf)
- [deploy.sh](scripts/deploy.sh)
- [.env.production.example](.env.production.example)
