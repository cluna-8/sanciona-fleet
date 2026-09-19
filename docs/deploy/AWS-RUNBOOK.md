# Runbook: despliegue en AWS (Sanciona Fleet)

> **Estado:** PRODUCCIÓN VIVA desde el 19 sep 2026. El stack corre en
> `https://sancionafleet.fexia.es` (EC2 `i-0dcf71a48674181c3`, EIP
> `63.181.51.42`): `bff-web` + `deadlines-service` en Docker, Caddy como reverse
> proxy con TLS de Let's Encrypt, secretos en SSM, imágenes en ECR. El primer
> arranque de cloud-init falló (paquete `awscli` sin candidato en noble); la EC2
> se bootstrapeó a mano con `scripts/bootstrap-ec2.sh` (ver §1.1). El primer
> deploy fue manual por SSM Run Command. Ver ADR 0003.

Sustituye a `ELEA-RUNBOOK.md` (Elea quedó fuera del alcance). El destino es
**AWS EC2 + Docker + Caddy**, dominio en **Cloudflare**, IA vía **OpenRouter**,
base en **Supabase** (región EU).

## 0. Prerrequisitos (gestión humana, una sola vez)

1. Cuentas: **GitHub Org** (compartida), **AWS** (org), **Cloudflare**,
   **Supabase Org** — con Cristian y Jorge como admins. Ver `TAREAS-CRISTIAN.md`
   Bloque 2.
2. Confirmar con Jorge (`jlinares_10`) el traspaso o uso compartido del
   proyecto Supabase actual, o crear uno **nuevo** en región EU
   (`eu-central-1`/Frankfurt) propiedad de la Org de Sanciona. **Recomendado
   para prod**: proyecto nuevo, para no depender del de Lovable.
3. **Dominio** registrado y añadido a Cloudflare como zona activa. Anotar el
   `zone_id`.

## 1. Crear la infra (Terraform)

```sh
cd infra/aws
terraform init
terraform plan  -var domain_name=sancionafleet.fexia.es
terraform apply -var domain_name=sancionafleet.fexia.es
```

Outputs a anotar: `instance_public_ip`, `instance_id`, `ecr_bff_web_url`,
`ecr_deadlines_url`, `github_deploy_role_arn`, `ssm_parameter_prefix`.

El `user_data.sh` deja la EC2 lista: Docker, docker compose, AWS CLI, Caddy y
el repo clonado en `/opt/sanciona-fleet`.

> **OIDC GitHub→AWS**: si es la primera vez, crear el proveedor OIDC en IAM
> (URL `https://token.actions.githubusercontent.com`, audience
> `sts.amazonaws.com`). El rol y su trust están en `infra/aws/iam.tf`. Ver
> `docs/deploy/CI-CD.md` §Prerrequisitos.

### 1.1. Si cloud-init falló (recuperación manual)

En el primer arranque real (18 sep 2026) el `user_data.sh` abortó porque el
paquete `awscli` no tenía candidato en el mirror noble de Ubuntu en ese
instante, y `set -euo pipefail` cortó el script antes de instalar Docker/Caddy.
Resultado: EC2 encendida pero vacía (nada en 80/443). El `user_data.sh` ya
instala `awscli` con el instalador bundled oficial (no apt), así que un
`terraform destroy && apply` nuevo no lo reproducirá. Pero si una instancia ya
está en ese estado, no hace falta recrearla: bootstrapear por SSM Run Command:

```sh
# El script está en el repo (scripts/bootstrap-ec2.sh). Se envía por SSM
# (base64 para evitar problemas de quoting):
B64=$(base64 -w0 scripts/bootstrap-ec2.sh)
aws ssm send-command --region eu-central-1 \
  --document-name AWS-RunShellScript \
  --instance-ids i-0dcf71a48674181c3 \
  --parameters "commands=[\"echo $B64 | base64 -d > /tmp/bs.sh && sudo bash /tmp/bs.sh\"]"
```

Es idempotente: instala lo que falte y clona el repo (público). Tras el
bootstrap, seguir por el §6 (deploy manual).

## 2. Rellenar secretos en SSM (no en el repo)

```sh
PFX=/sanciona-fleet/prod
aws ssm put-parameter --name "$PFX/SUPABASE_URL"                       --type String      --value "<url>"         --overwrite
aws ssm put-parameter --name "$PFX/SUPABASE_PUBLISHABLE_KEY"            --type String      --value "<anon>"        --overwrite
aws ssm put-parameter --name "$PFX/VITE_SUPABASE_URL"                   --type String      --value "<url>"         --overwrite
aws ssm put-parameter --name "$PFX/VITE_SUPABASE_PUBLISHABLE_KEY"       --type String      --value "<anon>"        --overwrite
aws ssm put-parameter --name "$PFX/VITE_SUPABASE_PROJECT_ID"           --type String      --value "<ref>"         --overwrite
aws ssm put-parameter --name "$PFX/SUPABASE_SERVICE_ROLE_KEY"          --type SecureString --value "<service>"     --overwrite
aws ssm put-parameter --name "$PFX/IA_PROVEEDOR"                        --type String      --value "openrouter"    --overwrite
aws ssm put-parameter --name "$PFX/IA_API_KEY"                          --type SecureString --value "<openrouter>"   --overwrite
aws ssm put-parameter --name "$PFX/IA_MODELO_EXTRACCION"               --type String      --value "<slug-or>"      --overwrite
aws ssm put-parameter --name "$PFX/IA_MODELO_ANALISIS"                  --type String      --value "<slug-or>"      --overwrite
aws ssm put-parameter --name "$PFX/PUBLIC_SITE_URL"                     --type String      --value "https://sancionafleet.fexia.es" --overwrite
# Opcional: Resend (correo transaccional)
aws ssm put-parameter --name "$PFX/RESEND_API_KEY" --type SecureString --value "<resend>" --overwrite
aws ssm put-parameter --name "$PFX/EMAIL_FROM"     --type String       --value "no-reply@sanciona-fleet.com" --overwrite
```

`IA_URL_BASE` ya tiene default correcto en `ssm.tf` (endpoint de OpenRouter).
`DEADLINES_SERVICE_URL` y `IA_TIMEOUT_MS` también.

> **OpenRouter**: los slugs de modelo **no** son los de Lovable. P.ej. no
> `gemini-3.7-flash`; usar el slug real de OpenRouter con soporte multimodal
> (PDF/imagen) para extracción. Probar con un PDF real antes de abrir a
> clientes (riesgos: bloque `file` puede rechazarse; `response_format
json_object` puede no soportarse). Ver `docs/compliance/README.md` §1.

## 3. Aplicar migraciones a la base de Supabase

```sh
export SUPABASE_DB_URL="postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:6543/postgres"
bun run db:migrar:dry   # ver qué aplicaría
bun run db:migrar       # aplicar
```

Ver `docs/deploy/DATABASE.md`.

## 4. DNS y TLS en Cloudflare

```sh
cd infra/cloudflare
terraform apply \
  -var cloudflare_api_token=<token> \
  -var cloudflare_zone_id=<zone_id> \
  -var ec2_public_ip=<instance_public_ip> \
  -var domain_name=sancionafleet.fexia.es
```

Crea el registro A (DNS-only, `proxied=false`) apuntando a la EIP. El token de
Cloudflare solo tiene `Zone:DNS:Edit`, así que el modo TLS se gestiona en el
panel (o ampliando el token; ver `infra/cloudflare/dns.tf`). Caddy termina TLS
en el origen con Let's Encrypt.

## 5. Configurar CI/CD en GitHub

Repo → Settings → Secrets and variables:

- **Variables**: `AWS_DEPLOY_ROLE_ARN` (output), `AWS_REGION` (`eu-central-1`),
  `AWS_EC2_INSTANCE_ID` (output).
- **Secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID` (build-args en compile-time).

A partir de aquí, cada push a `main` construye las imágenes, las sube a ECR y
despliega por SSM Run Command. Ver `docs/deploy/CI-CD.md`.

## 6. Primer despliegue (manual, para validar)

Si se quiere validar antes del primer push a `main`, ejecutar en la EC2 (por
SSM Session Manager o SSH):

```sh
cd /opt/sanciona-fleet
scripts/deploy-remote.sh latest
```

O desde fuera por SSM:

```sh
aws ssm send-command --document-name AWS-RunShellScript \
  --instance-ids i-xxxxx \
  --parameters 'commands=["/opt/sanciona-fleet/scripts/deploy-remote.sh latest"]'
```

Smoke:

```sh
curl -I https://sancionafleet.fexia.es/health   # 200 ok
```

## 7. Operación del día a día

- **Logs**: `docker compose -f docker-compose.prod.yml logs -f bff-web` en la
  EC2, o Caddy en `/var/log/caddy/`.
- **Reiniciar**: `docker compose -f docker-compose.prod.yml restart bff-web`.
- **Rollback**: redeployar un SHA anterior (ver `CI-CD.md` §Rollback).
- **Actualizar un secreto**: `aws ssm put-parameter ... --overwrite` y volver
  a desplegar (el `inject-secrets.sh` lo recoge).

## 8. Antes de abrir a clientes reales

No sustituye a `TAREAS-CRISTIAN.md` ni a SPEC §8 (bloqueadores legales/RGPD) ni
§9 (alcance MVP). En particular:

1. **Compliance** (bloqueante v1): DPA firmados (Supabase, OpenRouter, AWS,
   Cloudflare), validación jurídica del motor de plazos + festivos
   (RF-PLAZO-5), RIA y privacy policy. Ver `docs/compliance/README.md`.
2. **Seguridad**: cerrar RS-2 (`/sanciones/$id` sin filtro por organización),
   RS-3 (migración con contraseña en claro) y el endpoint público de alta de
   empresa con `service_role` sin captcha/límite. Ver
   `docs/spec/05-trazabilidad.md`.
3. **Prueba real con PDF** contra OpenRouter (extracción multimodal).
4. **Backup**: confirmar el plan de backups de Supabase (PITR si aplica) y
   el RPO/RTO con el asesor.
