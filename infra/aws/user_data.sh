#!/usr/bin/env bash
# user_data de la EC2 de Sanciona Fleet (ADR 0003). Se ejecuta una vez en el
# primer arranque. Deja el host listo para recibir despliegues por SSM Run
# Command: instala Docker, docker compose, AWS CLI, Caddy y clona el repo.
# NO contiene secretos: los secretos se leen de SSM Parameter Store en cada
# despliegue (ver scripts/inject-secrets.sh y docs/deploy/AWS-RUNBOOK.md).
set -euo pipefail

PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
REPO_URL="${repo_url}"
DOMAIN="${domain_name}"
APP_DIR="/opt/${PROJECT_NAME}"

export DEBIAN_FRONTEND=noninteractive

# --- Docker + compose ---
apt-get update -y
apt-get install -y ca-certificates curl gnupg git awscli caddy
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu

# --- Repo (solo para tener docker-compose.prod.yml, Caddyfile y scripts) ---
mkdir -p "${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
else
  (cd "${APP_DIR}" && git pull --ff-only)
fi

# --- Caddy: reverse proxy + TLS automático (Let's Encrypt) ---
# El Caddyfile lo gestiona el repo (infra/caddy/Caddyfile). Se copia en cada
# deploy con scripts/reload-caddy.sh.
cp "${APP_DIR}/infra/caddy/Caddyfile" /etc/caddy/Caddyfile
sed -i "s/__DOMAIN__/${DOMAIN}/g" /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy || true

echo "[sanciona] host listo. Proximo paso: el primer deploy desde CI (o manual) ejecuta"
echo "[sanciona]   scripts/deploy-remote.sh  (via SSM Run Command)"