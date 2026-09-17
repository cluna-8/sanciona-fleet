# Runbook: despliegue en AWS (Sanciona Fleet)

> **Estado:** el stack de producción (`docker-compose.prod.yml`) y la infra
> (`infra/`) están escritos y verificados en local (build + smoke `/health`).
> Los pasos de AWS/Cloudflare/Supabase requieren credenciales que esta sesión
> no tiene; son instrucciones para Cristian. Ver ADR 0003.

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
terraform plan  -var domain_name=app.sanciona-fleet.com
terraform apply -var domain_name=app.sanciona-fleet.com
```

Outputs a anotar: `instance_public_ip`, `instance_id`, `ecr_bff_web_url`,
`ecr_deadlines_url`, `github_deploy_role_arn`, `ssm_parameter_prefix`.

El `user_data.sh` deja la EC2 lista: Docker, docker compose, AWS CLI, Caddy y
el repo clonado en `/opt/sanciona-fleet`.

> **OIDC GitHub→AWS**: si es la primera vez, crear el proveedor OIDC en IAM
> (URL `https://token.actions.githubusercontent.com`, audience
> `sts.amazonaws.com`). El rol y su trust están en `infra/aws/iam.tf`. Ver
> `docs/deploy/CI-CD.md` §Prerrequisitos.

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
aws ssm put-parameter --name "$PFX/PUBLIC_SITE_URL"                     --type String      --value "https://app.sanciona-fleet.com" --overwrite
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
  -var domain_name=app.sanciona-fleet.com
```

Crea el registro A (proxied) y fuerza TLS Full + always_use_https + TLS 1.2/1.3.
Caddy pide el cert de Let's Encrypt en el primer arranque. Ver
`docs/deploy/DNS-TLS.md`.

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
curl -I https://app.sanciona-fleet.com/health   # 200 ok
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
