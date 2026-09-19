#!/usr/bin/env bash
# user_data de la EC2 de Sanciona Fleet (ADR 0003). Se ejecuta una vez en el
# primer arranque. Deja el host listo para recibir despliegues por SSM Run
# Command: instala Docker, docker compose, AWS CLI, Caddy y clona el repo.
# NO contiene secretos: los secretos se leen de SSM Parameter Store en cada
# despliegue (ver scripts/inject-secrets.sh y docs/deploy/AWS-RUNBOOK.md).
set -euo pipefail

# OJO: este archivo se procesa con terraform templatefile. Solo las cuatro
# asignaciones de abajo (project_name, environment, repo_url, domain_name,
# en minusculas) son interpolaciones de Terraform. TODO lo demas debe usar
# $VAR sin llaves: las llaves con mayusculas colisionarian con templatefile
# y romperian plan.
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
REPO_URL="${repo_url}"
DOMAIN="${domain_name}"
APP_DIR="/opt/$PROJECT_NAME"

export DEBIAN_FRONTEND=noninteractive

# --- Docker + compose ---
# OJO: awscli NO se instala por apt. En el primer arranque (18 sep 2026) el
# paquete `awscli` no tenia candidato en el mirror noble y `set -euo pipefail`
# aborto TODO el user_data: ni Docker ni Caddy ni el repo se llegaron a
# instalar. Se instala con el instalador bundled oficial (siempre disponible)
# mas abajo. Ver scripts/bootstrap-ec2.sh (recuperacion manual) y
# docs/deploy/AWS-RUNBOOK.md §1.1.
apt-get update -y
apt-get install -y ca-certificates curl gnupg git unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu

# --- AWS CLI (instalador bundled oficial; no apt) ---
if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# --- Caddy (repo oficial cloudsmith; no esta en los repos apt por defecto) ---
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
apt-get update -y
apt-get install -y caddy

# --- Repo (solo para tener docker-compose.prod.yml, Caddyfile y scripts) ---
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  (cd "$APP_DIR" && git pull --ff-only)
fi

# --- Caddy: reverse proxy + TLS automático (Let's Encrypt) ---
# El Caddyfile lo gestiona el repo (infra/caddy/Caddyfile). Se copia en cada
# deploy con scripts/reload-caddy.sh.
cp "$APP_DIR/infra/caddy/Caddyfile" /etc/caddy/Caddyfile
sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy || true

echo "[sanciona] host listo. Proximo paso: el primer deploy desde CI (o manual) ejecuta"
echo "[sanciona]   scripts/deploy-remote.sh  (via SSM Run Command)"