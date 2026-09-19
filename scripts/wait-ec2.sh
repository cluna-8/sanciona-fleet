#!/usr/bin/env bash
# scripts/wait-ec2.sh — Espera a que la EC2 (instance ID arg) termine cloud-init
# via SSM. Imprime el estado y sale cuando cloud-init esta done o error.
# Uso: bash scripts/wait-ec2.sh <instance-id>
set -uo pipefail
export PATH="$HOME/.local/bin:$PATH"
IID="${1:?falta instance-id}"
HERE="$(cd "$(dirname "$0")" && pwd)"
AWS="$HERE/../infra/aws/run-aws.sh"

for i in $(seq 1 40); do
  st="$($AWS ssm describe-instance-information --query 'InstanceInformationList[?InstanceId==`'"$IID"'`].PingStatus' --output text 2>/dev/null || true)"
  if [ "$st" != "Online" ]; then
    echo "poll $i: SSM pendiente ($st)"; sleep 15; continue
  fi
  cid="$($AWS ssm send-command --instance-ids "$IID" --document-name AWS-RunShellScript --parameters 'commands=["cloud-init status"]' --query 'Command.CommandId' --output text 2>/dev/null || true)"
  sleep 6
  cs="$($AWS ssm get-command-invocation --command-id "$cid" --instance-id "$IID" --query 'StandardOutputContent' --output text 2>/dev/null || true)"
  echo "poll $i: $cs"
  if echo "$cs" | grep -qE 'status: (done|error)'; then
    echo "cloud-init finalizo: $cs"; exit 0
  fi
  sleep 15
done
echo "TIMEOUT esperando cloud-init"; exit 1