#!/usr/bin/env bash
# reload-caddy.sh — Copia el Caddyfile del repo a /etc/caddy, sustituye
# __DOMAIN__ por el dominio real (de SSM o variable) y recarga Caddy.
# Lo llama deploy-remote.sh. Idempotente.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sanciona-fleet}"
DOMAIN="${DOMAIN_NAME:-}"

# Si no se pasa el dominio, leerlo de SSM (PUBLIC_SITE_URL contiene https://...).
if [ -z "${DOMAIN}" ]; then
  DOMAIN="$(aws ssm get-parameter \
    --name "/${PROJECT_NAME:-sanciona-fleet}/${ENVIRONMENT:-prod}/PUBLIC_SITE_URL" \
    --query 'Parameter.Value' --output text 2>/dev/null | sed 's#^https\?://##' || true)"
fi

if [ -z "${DOMAIN}" ]; then
  echo "[caddy] no se pudo determinar el dominio (DOMAIN_NAME o SSM PUBLIC_SITE_URL)" >&2
  exit 1
fi

echo "[caddy] dominio: ${DOMAIN}"
cp "${APP_DIR}/infra/caddy/Caddyfile" /etc/caddy/Caddyfile
sed -i "s/__DOMAIN__/${DOMAIN}/g" /etc/caddy/Caddyfile

systemctl is-active --quiet caddy && systemctl reload caddy || systemctl restart caddy
echo "[caddy] recargado."