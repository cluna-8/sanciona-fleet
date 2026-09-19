#!/usr/bin/env bash
# Wrapper para correr terraform de Cloudflare con credenciales desde
# infra/secrets.env (gitignored). No contiene secretos.
# Uso: bash infra/cloudflare/run-tf.sh <args> -var "ec2_public_ip=<IP>"
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
set -a
source "$(dirname "$0")/../secrets.env"
set +a
cd "$(dirname "$0")"
# Inyecta token/zone/dominio desde secrets.env; la IP de la EC2 se pasa con -var.
exec terraform "$@" \
  -var "cloudflare_api_token=$CLOUDFLARE_API_TOKEN" \
  -var "cloudflare_zone_id=$CLOUDFLARE_ZONE_ID" \
  -var "domain_name=$DOMAIN_NAME"