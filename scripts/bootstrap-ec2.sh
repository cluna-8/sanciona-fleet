#!/usr/bin/env bash
# bootstrap-ec2.sh — Puesta a punto manual de la EC2 de Sanciona Fleet.
# Sustituye a user_data.sh cuando cloud-init falló (caso real: el paquete
# `awscli` no tenía candidato en el mirror noble en el primer arranque y
# `set -euo pipefail` abortó todo el user_data). Idempotente: se puede rerun.
#
# Instala: Docker + compose v2, AWS CLI (instalador oficial bundled, no apt),
# Caddy (repo cloudsmith) y clona el repo PÚBLICO en /opt/sanciona-fleet.
# No contiene secretos: los secretos se leen de SSM en cada deploy.
set -euo pipefail

APP_DIR="/opt/sanciona-fleet"
REPO_URL="https://github.com/cluna-8/sanciona-fleet.git"
DOMAIN="sancionafleet.fexia.es"

export DEBIAN_FRONTEND=noninteractive

echo "== [bootstrap] paquetes base =="
apt-get update -y
apt-get install -y ca-certificates curl gnupg git unzip

echo "== [bootstrap] AWS CLI (bundled installer) =="
if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install || /tmp/aws/install --update
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi
aws --version

echo "== [bootstrap] Docker + compose v2 =="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  usermod -aG docker ubuntu || true
fi
docker --version
docker compose version

echo "== [bootstrap] Caddy (repo cloudsmith) =="
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

echo "== [bootstrap] repo (publico) =="
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  (cd "$APP_DIR" && git pull --ff-only) || true
fi

echo "== [bootstrap] Caddyfile =="
cp "$APP_DIR/infra/caddy/Caddyfile" /etc/caddy/Caddyfile
sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/caddy/Caddyfile
systemctl enable caddy
systemctl is-active --quiet caddy && systemctl reload caddy || systemctl restart caddy

echo "== [bootstrap] OK — host listo para deploy-remote.sh =="