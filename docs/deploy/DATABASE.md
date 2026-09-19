# Base de datos — Sanciona Fleet

Base **gestionada en Supabase** (Postgres + Auth + Storage + RLS). Ver ADR 0001.
Una base por entorno (dev / staging / prod), todas en **región EU** por RGPD.

Las migraciones viven en `apps/bff-web/supabase/migrations/*.sql` (18 ficheros,
prefix de timestamp). Se aplican con `scripts/db/migrar.ts` (sin CLI de
Supabase, vía cadena de conexión directa + `pg`).

## Por entorno

| Entorno         | Proyecto Supabase                      | Cómo se aplica                                        | Secretos                     |
| --------------- | -------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| **local**       | `supabase start` (Docker, config.toml) | `scripts/db/migrar.ts` con `SUPABASE_DB_URL` local    | `.env` (no commiteado)       |
| **dev/staging** | proyecto Supabase de preprod           | `bun run db:migrar` manual o desde CI                 | SSM `/sanciona-fleet/dev/*`  |
| **prod**        | proyecto Supabase de prod (región EU)  | `bun run db:migrar` desde CI (job `migrate` o manual) | SSM `/sanciona-fleet/prod/*` |

## Aplicar migraciones

```sh
# Cadena del pooler de Supabase (Session o Transaction mode). Para migraciones
# usa el puerto 5432 (direct) o 6543 (transaction pooler).
export SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

# 1. Ver qué aplicaría sin tocar nada
bun run db:migrar:dry

# 2. Aplicar
bun run db:migrar
```

`migrar.ts` crea `public._schema_migrations(filename, applied_at, checksum)` si
no existe, aplica los `*.sql` pendientes en orden de timestamp, cada uno en una
transacción, y registra el SHA-256. Si uno falla, aborta sin marcar.

> **No** se usa `supabase db push` para no acoplar CI al CLI de Supabase. El
> script es suficiente para esquema lineal (sin splits/renames complejos). Si
> alguna migración futura necesita DDL no transaccional (p.ej. `create index
concurrently`), sacarla fuera del script y documentarla en este archivo.

## Configuración por entorno

- **`apps/bff-web/supabase/config.toml`** es solo para el stack local de
  Supabase CLI (`supabase start`). `project_id` es un alias local.
- **Proyecto real**: el `ref` (y la URL) van en `SUPABASE_URL` /
  `VITE_SUPABASE_URL`; las claves en `SUPABASE_PUBLISHABLE_KEY` (pública) y
  `SUPABASE_SERVICE_ROLE_KEY` (secreta, solo backend). En prod, todo en SSM
  (`infra/aws/ssm.tf`); `inject-secrets.sh` lo vuelca a `apps/bff-web/.env`.
- **Región**: crear los proyectos Supabase en `eu-central-1` (Frankfurt) o
  `west-eu`. Mismo razonamiento RGPD que AWS.

## RLS

Todas las tablas de negocio (`organizations`, `profiles`, `sanctions`, ...)
tienen RLS activada (ver migraciones). El `bff-web` usa la **service role key**
en el backend solo para operaciones que requieren bypass de RLS (escrituras de
sistema); el navegador usa la **publishable key** con RLS. Nunca exponer la
service role key al cliente.

## Backup y recuperación

- Supabase gestiona backups diarios (PITR en plan de pago; snapshot en free).
- Para exportar manualmente: panel de Supabase → Database → Backups, o
  `pg_dump` contra la cadena del pooler.
- No hay RDS propio que respaldar; la responsabilidad del backup la tiene
  Supabase. Documentar el RPO/RTO acordado en `docs/compliance/README.md`.

## Añadir una migración

1. Crear `apps/bff-web/supabase/migrations/<timestamp>_<slug>.sql` (timestamp
   YYYYMMDDHHMMSS, orden cronológico).
2. Testear en local (`supabase start` + `bun run db:migrar`).
3. Commitear. Al mergear a `main`, CI podría aplicarla (job `migrate` futuro;
   por ahora, manual desde el runbook).

## Estado real (19 sep 2026) — esquema de prod pendiente

El proyecto Supabase de prod `gwugycdyhcmojpjlitps` (región EU, al que apuntan
`SUPABASE_URL` / `VITE_SUPABASE_URL` en SSM) **no tiene el esquema de la
aplicación**: las 18 migraciones del repo **nunca se aplicaron**. Es el destino
limpio de la migración desde el prototipo de Lovable (congelado; ver
`docs/legacy/CAMBIOS-LOVABLE.md` y ADR 0002), no el origen. La app sirve y el
login funciona (`auth.users` es una tabla que Supabase gestiona por defecto),
pero cualquier operación de datos falla hasta aplicar el esquema.

**Para aplicar el esquema hace falta acceso a nivel de base**, y la
`service_role` **no basta**: PostgREST no expone DDL (crear tablas), la
Management API de Supabase rechaza la `service_role` (401) y no hay ningún RPC
`exec_sql` expuesto por defecto. Se necesita una de:

1. **Password de la base** del proyecto `gwugycdyhcmojpjlitps` (Project Settings
   → Database → Connection string). Con ella se corre
   `SUPABASE_DB_URL=postgresql://postgres.gwugycdyhcmojpjlitps:<pass>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres bun run scripts/db/migrar.ts`
   (antes `db:migrar:dry`). Ese valor debería vivir en SSM como
   `SUPABASE_DB_URL` para futuros deploys.
2. **Personal Access Token de Supabase** (`supabase.com/dashboard/account/tokens`)
   para usar la Management API `POST /v1/projects/{ref}/database/query` y lanzar
   el SQL de las migraciones.

Si nadie con acceso al proyecto `gwugycdyhcmojpjlitps` puede dar ninguna de las
dos, la alternativa es **crear un Supabase nuevo** bajo una cuenta que
controlemos (región EU), aplicar las migraciones allí y repuntar la app
(actualizar `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_*` y `SUPABASE_DB_URL` en SSM,
rebuild de la imagen `bff-web` con los nuevos `VITE_*` y redeploy).

### Orden de aplicación (18 ficheros, lineal)

`migrar.ts` los aplica en orden de timestamp. Verificado que están limpias de
credenciales/personal real (RS-3): los `11111111-…` son UUIDs de la org
**demo** ("Transportes Levante Demo") y los `service_role` que aparecen son
destinos de `GRANT` (SQL normal), no secretos. Tras aplicar, el esquema incluye
`organizations`, `organization_memberships`, `profiles`, `vehicles`,
`sanctions`, `sanction_deadlines`, `sanction_actions`, `sanction_comments`,
`activity_logs`, `legal_sources`, `platform_admins`, etc., con RLS y funciones
`is_org_member` / `has_org_role` / `is_platform_admin`.

### Tras aplicar el esquema

- **Primer admin/superadmin**: dar de alta un usuario desde la web (autoservicio)
  y promoverlo con `scripts/db/crear-superadmin.sql` (inserta en
  `platform_admins`; busca por email, no por UUID).
- **Primera empresa**: el alta desde la web crea `organizations` + la membresía
  del usuario. La org demo "Transportes Levante Demo" queda sembrada por la
  migración para probar sin dar de alta nada.
