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

## Estado real (19 sep 2026) — esquema de prod APLICADO ✅

El proyecto Supabase de prod `gwugycdyhcmojpjlitps` (al que apuntan
`SUPABASE_URL` / `VITE_SUPABASE_URL` en SSM) **tiene el esquema completo**: las
**18 migraciones del repo se aplicaron** el 19 sep 2026 con
`scripts/db/migrar.ts` contra el pooler. Es el destino limpio de la migración
desde el prototipo de Lovable (congelado; ver `docs/legacy/CAMBIOS-LOVABLE.md`
y ADR 0002).

Tras aplicar, `public._schema_migrations` registra 18 filas y el esquema incluye
`organizations`, `organization_members`, `profiles`, `vehicles`, `sanctions`,
`sanction_deadlines`, `sanction_actions`, `sanction_comments`, `activity_logs`,
`legal_sources`, `platform_admins`, etc. (22 tablas), con RLS y funciones
`is_org_member` / `has_org_role` / `is_platform_admin`. La org demo
"Transportes Levante Demo, S.L." (`11111111-…`) queda sembrada.

> **Importante — host/region del pooler.** La conexión **directa**
> `db.gwugycdyhcmojpjlitps.supabase.co:5432` es **solo IPv6** (sin registro A);
> desde entornos sin IPv6 (la EC2 de deploy, máquinas sin ruta v6) es
> inalcanzable. El **pooler** de este proyecto está en
> **`aws-1-eu-west-1.pooler.supabase.com`** (Dublin), **no** `aws-0-eu-central-1`
> (el cluster eu-central-1 responde "tenant not found"). Usar modo sesión
> (puerto **5432**) para DDL multi-statement en transacción; 6543 es modo
> transacción. Usuario: `postgres.gwugycdyhcmojpjlitps`.
>
> Nota: la infra AWS está en `eu-central-1` (Frankfurt) y Supabase en
> `eu-west-1` (Dublin) — ambas región EU (RGPD), pero la app cruza región
> EU↔EU para llegar a la BD. Si se quiere misma región, recrear el Supabase en
> eu-central-1 o mover la EC2 a eu-west-1.

### Cómo se aplicó (y cómo re-aplicar migraciones futuras)

```sh
# Cadena del pooler (sesión, 5432). El password va en SSM
# /sanciona-fleet/prod/SUPABASE_DB_URL (ver abajo).
export SUPABASE_DB_URL="postgresql://postgres.gwugycdyhcmojpjlitps:<pass>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

# 1. Ver qué aplicaría sin tocar nada
bun run db:migrar:dry

# 2. Aplicar (cada migración en su transacción; aborta sin marcar si una falla)
bun run db:migrar
```

`migrar.ts` es idempotente: crea `public._schema_migrations` si no existe,
compara por `filename` y SHA-256, y aplica solo los pendientes. Re-aplicar tras
añadir una migración nueva es seguro.

### Credencial de base en SSM

La `service_role` **no basta** para DDL (PostgREST no expone crear tablas; la
Management API rechaza `service_role` 401; no hay `exec_sql` por defecto). Para
aplicar migraciones hace falta la **password de la base** (Project Settings →
Database → Connection string). Ese valor vive en SSM como
**`/sanciona-fleet/prod/SUPABASE_DB_URL`** (SecureString, la cadena completa
con `postgres.<ref>:<pass>@aws-1-eu-west-1.pooler.supabase.com:5432`). El
contenedor `bff-web` **no** la lee (usa `service_role` vía PostgREST); solo la
usa el runner de migraciones, manual o desde un futuro job `migrate` de CI.

### Orden de aplicación (18 ficheros, lineal)

`migrar.ts` los aplica en orden de timestamp. Verificado que están limpias de
credenciales/personal real (RS-3): los `11111111-…` son UUIDs de la org
**demo** ("Transportes Levante Demo") y los `service_role` que aparecen son
destinos de `GRANT` (SQL normal), no secretos. Tras aplicar, el esquema incluye
`organizations`, `organization_memberships`, `profiles`, `vehicles`,
`sanctions`, `sanction_deadlines`, `sanction_actions`, `sanction_comments`,
`activity_logs`, `legal_sources`, `platform_admins`, etc., con RLS y funciones
`is_org_member` / `has_org_role` / `is_platform_admin`.

### Tras aplicar el esquema — estado de cuentas (19 sep 2026)

- **Cuenta de Cristian** (`cristian@sanciona-fleet.com`,
  `auth.users.id = cc8161f2-9907-41b6-bb8f-6220d6130c3e`) creada vía Admin API
  de Supabase; login verificado. Al registrarse, el BFF creó su organización
  `4dfd1713-…` ("cristian") y la membresía con rol `admin_empresa`. **El panel
  es funcional**: al entrar ve su org y puede operar vehículos/sanciones.
- **Superadmin de plataforma**: `platform_admins` arranca vacío. Para promover
  a Cristian (acceso de plataforma, cross-org) ejecutar
  `scripts/db/crear-superadmin.sql` con `admin_email='cristian@sanciona-fleet.com'`
  (busca por email, inserta en `platform_admins`; requiere conexión de base).
  **Pendiente de autorización explícita** del propietario.
- **Org demo**: "Transportes Levante Demo, S.L." (`11111111-…`) sembrada por la
  migración. Para probarla, añadir a Cristian como miembro de esa org.
