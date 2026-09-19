# CI/CD — Sanciona Fleet

Pipeline en GitHub Actions que, en cada push a `main`, verifica el repo,
construye las imágenes de `bff-web` y `deadlines-service`, las sube a ECR y
despliega en la EC2 por **SSM Run Command**. Sin claves estáticas: GitHub asume
un rol de AWS por **OIDC** (ver `infra/aws/iam.tf`).

Ver ADR 0003 y `infra/README.md`.

## Pipeline (`.github/workflows/ci.yml`)

```
verificar (typecheck + lint + build + tests)   [PR y push]
   │  solo en push a main:
   ▼
build-and-push  →  ECR (sha + latest)            [OIDC → ECR]
   ▼
deploy  →  SSM Run Command en la EC2            [OIDC → SSM]
            └ deploy-remote.sh <sha>
                ├ git pull
                ├ inject-secrets.sh   (SSM → apps/bff-web/.env)
                ├ docker compose pull (ECR)
                ├ docker compose up -d
                └ reload-caddy.sh
```

El motor de plazos tiene consecuencia legal directa: si `bun test` falla, no
se construye ni despliega nada (SPEC §7.4). El `concurrency` cancela runs
obsoletos de la misma rama.

## Prerrequisitos (una sola vez)

1. **Infra creada**: `cd infra/aws && terraform apply`. Anotar outputs
   `github_deploy_role_arn` y `instance_id`.
2. **OIDC de GitHub en AWS**: el primer `terraform apply` referencia el proveedor
   `token.actions.githubusercontent.com`. Si no existe aún, hay que crearlo a
   mano una vez (IAM → Identity providers → Add provider → OpenID Connect,
   URL `https://token.actions.githubusercontent.com`, audience
   `sts.amazonaws.com`). El rol y su trust están en `iam.tf`.

   > **Claim `sub` en repos de usuario.** GitHub firma el `sub` del OIDC de dos
   > formas: `repo:<org>/<repo>:ref:...` para repos de organización, y
   > `repo:<login>@<owner_id>/<repo>@<repo_id>:ref:...` para repos de **usuario**
   > (el `@<id>` evita que un renombrado de cuenta herede el permiso). Este repo
   > es de usuario (`cluna-8/sanciona-fleet`, owner_id `187745221`,
   > repo_id `1370951890`), así que `iam.tf` acepta **ambos** formatos en el
   > `StringLike`. Si `build-and-push` falla con
   > `Not authorized to perform sts:AssumeRoleWithWebIdentity` y el trust parece
   > correcto, comprueba en CloudTrail el `sub` real: el literal sin `@id` no
   > coincide. Los IDs se obtienen con
   > `gh api repos/cluna-8/sanciona-fleet --jq '"owner=\(.owner.id) repo=\(.id)"'`.
3. **Secretos de GitHub (repo → Settings → Secrets and variables)**:
   - **Variables** (no sensibles, se ven en logs):
     - `AWS_DEPLOY_ROLE_ARN` ← output `github_deploy_role_arn`
     - `AWS_REGION` ← `eu-central-1`
     - `AWS_EC2_INSTANCE_ID` ← output `instance_id`
   - **Secrets** (sensibles, son build-args de VITE_*):
     - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
       `VITE_SUPABASE_PROJECT_ID` de Supabase.
4. **Secretos en AWS SSM** (no en GitHub): `SUPABASE_SERVICE_ROLE_KEY`,
   `IA_API_KEY`, `IA_MODELO_EXTRACCION`, `IA_MODELO_ANALISIS`, etc. Los rellena
   Cristian a mano (ver `infra/aws/ssm.tf` y `AWS-RUNBOOK.md`). El runtime los
   lee en cada deploy con `inject-secrets.sh`.

> Los `VITE_*` van en GitHub Secrets porque se inyectan en **compile-time**
> (build de la imagen). El resto va en SSM porque se leen en **runtime**.

## Despliegue manual (sin CI)

Sobre la EC2 (por SSM Session Manager o SSH):

```sh
cd /opt/sanciona-fleet
scripts/deploy-remote.sh latest
```

O desde fuera, por SSM:

```sh
aws ssm send-command \
  --document-name AWS-RunShellScript \
  --instance-ids i-xxxxx \
  --parameters 'commands=["/opt/sanciona-fleet/scripts/deploy-remote.sh latest"]'
```

## Rollback

Los tags de ECR son inmutables por push pero el tag `latest` es `MUTABLE` (ver
`ecr.tf`), así que rollback = redeployar un SHA anterior:

```sh
aws ssm send-command --document-name AWS-RunShellScript \
  --instance-ids i-xxxxx \
  --parameters 'commands=["/opt/sanciona-fleet/scripts/deploy-remote.sh <sha-anterior>"]'
```

> Para tener rollback inmutable real, cambiar `image_tag_mutability` a
> `IMMUTABLE` y mover `latest` a un tag `stable` gestionado por promoción.
> Documentar antes en un ADR nuevo.

## Scripts

- `scripts/deploy-remote.sh` — orquesta el deploy en la EC2 (git pull, secrets,
  pull, up, caddy, smoke).
- `scripts/inject-secrets.sh` — SSM → `apps/bff-web/.env`.
- `scripts/reload-caddy.sh` — copia el Caddyfile, sustituye dominio, recarga.

## Coste

GitHub Actions: 2000 min/mes gratis en cuentas privadas de org; el pipeline
tarda ~6–8 min. ECR: almacenamiento barato (~0,10 €/GB/mes) + scan on push
gratis. SSM Run Command: gratis para instancias gestionadas.
