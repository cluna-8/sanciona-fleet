#!/usr/bin/env bash
# inject-secrets.sh — Lee los secretos/config de AWS SSM Parameter Store y
# genera apps/bff-web/.env en la EC2. Lo llama deploy-remote.sh.
#
# NUNCA escribe secretos en el repo: solo en apps/bff-web/.env (que está en
# .gitignore). Los VITE_* se exportan además como variables de entorno para que
# `docker compose build` los inyecte en compile-time (son build args).
#
# Uso: inject-secrets.sh
# Requiere: AWS CLI con credenciales del rol de instancia EC2 (SSM:GetParameter).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sanciona-fleet}"
PROJECT="${PROJECT_NAME:-sanciona-fleet}"
ENV="${ENVIRONMENT:-prod}"
PREFIX="/${PROJECT}/${ENV}"
ENV_FILE="${APP_DIR}/apps/bff-web/.env"

if ! command -v aws >/dev/null 2>&1; then
  echo "[inject] falta awscli" >&2; exit 1
fi

# Lista de claves a leer de SSM (debe coincidir con infra/aws/ssm.tf).
CONFIG_KEYS=(
  SUPABASE_URL SUPABASE_PUBLISHABLE_KEY
  VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_PROJECT_ID
  IA_PROVEEDOR IA_URL_BASE IA_MODELO_EXTRACCION IA_MODELO_ANALISIS IA_TIMEOUT_MS
  DEADLINES_SERVICE_URL RESEND_API_KEY EMAIL_FROM PUBLIC_SITE_URL
)
SECRET_KEYS=(SUPABASE_SERVICE_ROLE_KEY IA_API_KEY)

echo "[inject] generando ${ENV_FILE} desde SSM (${PREFIX}/...)"
{
  echo "# Generado por inject-secrets.sh — NO commitear. Origen: SSM ${PREFIX}/."
  for k in "${CONFIG_KEYS[@]}"; do
    v="$(aws ssm get-parameter --name "${PREFIX}/${k}" --query 'Parameter.Value' --output text 2>/dev/null || true)"
    printf '%s=%s\n' "$k" "$v"
  done
  for k in "${SECRET_KEYS[@]}"; do
    v="$(aws ssm get-parameter --name "${PREFIX}/${k}" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || true)"
    printf '%s=%s\n' "$k" "$v"
  done
} >"${ENV_FILE}"
chmod 600 "${ENV_FILE}"

# Exportar VITE_* para que docker compose build los pase como build args.
for k in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_PROJECT_ID; do
  v="$(aws ssm get-parameter --name "${PREFIX}/${k}" --query 'Parameter.Value' --output text 2>/dev/null || true)"
  export "$k=$v"
done

echo "[inject] ok ($(wc -l <"${ENV_FILE}") líneas)."