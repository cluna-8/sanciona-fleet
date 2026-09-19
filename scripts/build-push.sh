#!/usr/bin/env bash
# scripts/build-push.sh — Construye las imagenes prod (bff-web + deadlines-service)
# localmente y las empuja a ECR. No imprime secretos.
#
# Requiere: Docker local, infra/secrets.env (AWS), apps/bff-web/.env (VITE_*).
# Uso: bash scripts/build-push.sh
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

# Credenciales AWS + VITE_* (publicos) desde los .env gitignored.
set -a
# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")/.." && pwd)/infra/secrets.env"
# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")/.." && pwd)/apps/bff-web/.env"
set +a
export AWS_DEFAULT_REGION="$AWS_REGION"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export ECR_BFF_WEB_IMAGE="${REGISTRY}/sanciona-fleet/bff-web:latest"
export ECR_DEADLINES_IMAGE="${REGISTRY}/sanciona-fleet/deadlines-service:latest"

echo ">> Login ECR (${REGISTRY})"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

echo ">> Build bff-web + deadlines-service"
docker compose -f docker-compose.prod.yml build

echo ">> Push a ECR"
docker compose -f docker-compose.prod.yml push

echo ">> Listo. Imágenes:"
echo "   ${ECR_BFF_WEB_IMAGE}"
echo "   ${ECR_DEADLINES_IMAGE}"