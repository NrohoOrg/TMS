#!/usr/bin/env bash
set -euo pipefail

# This script runs ON THE SERVER.
# Required env vars: GHCR_OWNER, SHA, GITHUB_TOKEN, GITHUB_ACTOR

: "${GHCR_OWNER:?missing}"
: "${SHA:?missing}"
: "${GITHUB_TOKEN:?missing}"
: "${GITHUB_ACTOR:?missing}"

STAGING=/opt/tms/staging
TMS_DIR=/opt/tms
NGINX_SITES=/root/server/nginx_reverse_proxy_server/sites-available

API_IMAGE="ghcr.io/${GHCR_OWNER}/tms-api:${SHA}"
OPTIMIZER_IMAGE="ghcr.io/${GHCR_OWNER}/tms-optimizer:${SHA}"
WEB_IMAGE="ghcr.io/${GHCR_OWNER}/tms-web:${SHA}"

echo "[deploy] Verifying server_app_network exists..."
if ! docker network inspect server_app_network >/dev/null 2>&1; then
  echo "[deploy] ERROR: docker network 'server_app_network' is missing."
  echo "[deploy] This network is owned by the nginx reverse-proxy stack and must exist before TMS can deploy."
  echo "[deploy] Bring up the nginx stack first, or create the network manually:"
  echo "[deploy]   docker network create server_app_network"
  exit 1
fi

echo "[deploy] Logging into GHCR..."
echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

echo "[deploy] Pulling images..."
docker pull "${API_IMAGE}"
docker pull "${OPTIMIZER_IMAGE}"
docker pull "${WEB_IMAGE}"

echo "[deploy] Updating nginx site files..."
cp "${STAGING}/tms.nroho.dz-https.conf"     "${NGINX_SITES}/tms.nroho.dz-https.conf"
cp "${STAGING}/api.tms.nroho.dz-https.conf" "${NGINX_SITES}/api.tms.nroho.dz-https.conf"

echo "[deploy] Validating nginx config..."
if ! docker exec nginx nginx -t; then
  echo "[deploy] nginx config invalid — aborting!"
  exit 1
fi
echo "[deploy] Reloading nginx..."
docker exec nginx nginx -s reload

echo "[deploy] Updating compose file..."
cp "${STAGING}/docker-compose.prod.yml" "${TMS_DIR}/docker-compose.prod.yml"

echo "[deploy] Deploying TMS stack..."
cd "${TMS_DIR}"
API_IMAGE="${API_IMAGE}" \
OPTIMIZER_IMAGE="${OPTIMIZER_IMAGE}" \
WEB_IMAGE="${WEB_IMAGE}" \
docker compose -p tms -f docker-compose.prod.yml --env-file .env.production up -d

echo "[deploy] Waiting for health checks..."
for i in {1..30}; do
  api_health=$(docker inspect -f '{{.State.Health.Status}}' tms_api 2>/dev/null || echo "missing")
  web_health=$(docker inspect -f '{{.State.Health.Status}}' tms_web 2>/dev/null || echo "missing")
  if [[ "$api_health" == "healthy" && "$web_health" == "healthy" ]]; then
    echo "[deploy] All services healthy"
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "[deploy] Timeout waiting for health (api=$api_health web=$web_health)"
    docker compose -p tms -f docker-compose.prod.yml logs --tail 50
    exit 1
  fi
  sleep 5
done

echo "[deploy] Pruning old images (keeping last 3)..."
docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/NrohoOrg/TMS"

echo "[deploy] Done."
