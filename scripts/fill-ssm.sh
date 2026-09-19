#!/usr/bin/env bash
# scripts/fill-ssm.sh — Sube los valores reales de apps/bff-web/.env a los
# parametros SSM que Terraform dejo como PENDIENTE-RELLENAR. No imprime valores.
#
# Solo rellena las claves que TF no conoce (Supabase, IA modelos, Resend,
# secretos). Las claves con valor fijo de TF (IA_PROVEEDOR, IA_URL_BASE,
# IA_TIMEOUT_MS, DEADLINES_SERVICE_URL, PUBLIC_SITE_URL) se respetan.
#
# Uso: bash scripts/fill-ssm.sh [ruta/al/.env]
# Requiere: infra/secrets.env (AWS creds, PROJECT_NAME, ENVIRONMENT).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
ENV_FILE="${1:-apps/bff-web/.env}"

set -a
# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")/.." && pwd)/infra/secrets.env"
set +a
export AWS_DEFAULT_REGION="$AWS_REGION"

PREFIX="/${PROJECT_NAME:-sanciona-fleet}/${ENVIRONMENT:-prod}"
SECRET_KEYS="SUPABASE_SERVICE_ROLE_KEY IA_API_KEY"
# Claves a rellenar desde el .env (el resto las gestiona Terraform).
FILL_KEYS="SUPABASE_URL SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_PROJECT_ID IA_MODELO_EXTRACCION IA_MODELO_ANALISIS RESEND_API_KEY EMAIL_FROM SUPABASE_SERVICE_ROLE_KEY IA_API_KEY"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE" >&2; exit 1
fi

# Lee un valor del .env: KEY=VALUE (sin imprimirlo).
get_val() {
  local key="$1"
  # Solo la primera coincidencia; quita comillas envolventes.
  grep -m1 "^${key}=" "$ENV_FILE" | sed "s/^${key}=//" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
}

count=0
for key in $FILL_KEYS; do
  val="$(get_val "$key")"
  if [ -z "$val" ]; then
    echo "  SKIP $key (vacio en .env)"
    continue
  fi
  type="String"
  for sk in $SECRET_KEYS; do [ "$key" = "$sk" ] && type="SecureString"; done
  aws ssm put-parameter \
    --name "${PREFIX}/${key}" \
    --value "$val" \
    --type "$type" \
    --overwrite \
    --no-cli-pager >/dev/null
  echo "  OK   $key (${type}) -> ${PREFIX}/${key}"
  count=$((count + 1))
done
echo "Subidos $count parametros a SSM bajo ${PREFIX}/"