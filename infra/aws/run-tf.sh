#!/usr/bin/env bash
# Wrapper para correr terraform con credenciales cargadas desde infra/secrets.env
# (gitignored). No contiene secretos. Uso: bash run-tf.sh <args de terraform...>
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
set -a
source "$(dirname "$0")/../secrets.env"
set +a
export AWS_DEFAULT_REGION="$AWS_REGION"
cd "$(dirname "$0")"
exec terraform "$@"