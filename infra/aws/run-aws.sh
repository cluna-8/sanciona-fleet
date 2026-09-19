#!/usr/bin/env bash
# Wrapper para la AWS CLI con credenciales desde infra/secrets.env (gitignored).
# No contiene secretos. Uso: bash infra/aws/run-aws.sh <args de aws>
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
set -a
source "$(dirname "$0")/../secrets.env"
set +a
export AWS_DEFAULT_REGION="$AWS_REGION"
exec aws "$@"