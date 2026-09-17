#!/usr/bin/env bash
# deploy-remote.sh — Despliegue en la EC2 de Sanciona Fleet. Lo invoca GitHub
# Actions por SSM Run Command (AWS-RunShellScript) después de push a ECR.
# También se puede ejecutar a mano sobre la EC2.
#
# Flujo: git pull → inject-secrets → docker compose pull (ECR) → up -d →
# reload-caddy. NO construye imágenes aquí: las imágenes vienen de ECR.
#
# Uso: deploy-remote.sh [IMAGE_TAG]
#   IMAGE_TAG  tag a desplegar (default: latest). Coincide con el tag pusheado
#              por CI (el SHA corto del commit).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sanciona-fleet}"
TAG="${1:-latest}"
PROJECT="${PROJECT_NAME:-sanciona-fleet}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"

cd "${APP_DIR}"

echo "== [sanciona] git pull =="
git pull --ff-only

echo "== [sanciona] secretos desde SSM =="
"${APP_DIR}/scripts/inject-secrets.sh"

# Determinar la cuenta de AWS para los URIs de ECR (si no se pasa).
if [ -z "${ACCOUNT_ID}" ]; then
  ACCOUNT_ID="$(aws sts get-caller-identity --query 'Account' --output text)"
fi
ECR_BFF_WEB="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}/bff-web:${TAG}"
ECR_DEADLINES="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}/deadlines-service:${TAG}"
export ECR_BFF_WEB_IMAGE="${ECR_BFF_WEB}"
export ECR_DEADLINES_IMAGE="${ECR_DEADLINES}"

echo "== [sanciona] login ECR + pull =="
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin \
    "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps

echo "== [sanciona] caddy =="
"${APP_DIR}/scripts/reload-caddy.sh"

echo "== [sanciona] smoke /health =="
sleep 3
curl -fsS "http://127.0.0.1:8080/health" >/dev/null && echo "ok" || echo "FALLO /health (revisar docker compose logs)"
echo "== [sanciona] deploy ${TAG} completado =="