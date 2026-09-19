#!/usr/bin/env bash
# run-e2e.sh — inyecta los secretos de Supabase desde SSM y corre Playwright E2E
# contra prod. Los secretos van al env del proceso de test, NUNCA al stdout ni al
# repo. Uso: bash scripts/run-e2e.sh [args de playwright...]
#
# Requiere: AWS CLI con acceso a SSM (infra/aws/run-aws.sh) y @playwright/test.
set -euo pipefail
cd "$(dirname "$0")/.."

AWS() { bash infra/aws/run-aws.sh "$@"; }

export SUPABASE_URL="$(AWS ssm get-parameter --name /sanciona-fleet/prod/SUPABASE_URL --query 'Parameter.Value' --output text 2>/dev/null)"
export SUPABASE_PUBLISHABLE_KEY="$(AWS ssm get-parameter --name /sanciona-fleet/prod/SUPABASE_PUBLISHABLE_KEY --query 'Parameter.Value' --output text 2>/dev/null)"
export SUPABASE_SERVICE_ROLE_KEY="$(AWS ssm get-parameter --name /sanciona-fleet/prod/SUPABASE_SERVICE_ROLE_KEY --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)"

# Cuenta de prueba. El password NUNCA se hardcodea aquí: debe venir de env
# (E2E_PASSWORD). Ej.:  export E2E_PASSWORD='...' && bash scripts/run-e2e.sh
export E2E_EMAIL="${E2E_EMAIL:-cristian@sanciona-fleet.com}"
export E2E_BASE_URL="${E2E_BASE_URL:-https://sancionafleet.fexia.es}"
: "${E2E_PASSWORD:?Falta E2E_PASSWORD. Exporta la variable de entorno antes de ejecutar (ej.: export E2E_PASSWORD='...').}"

: "${SUPABASE_URL:?Falta SUPABASE_URL en SSM}"
: "${SUPABASE_PUBLISHABLE_KEY:?Falta SUPABASE_PUBLISHABLE_KEY en SSM}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Falta SUPABASE_SERVICE_ROLE_KEY en SSM}"
echo "[e2e] secretos cargados desde SSM. Base URL: $E2E_BASE_URL"

export PATH="$HOME/.bun/bin:$PATH"
cd apps/bff-web
exec ./node_modules/.bin/playwright test "$@"