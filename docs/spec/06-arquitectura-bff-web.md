# Arquitectura de `apps/bff-web`

Qué hace el frontend y cómo está construido por dentro, tras el refactor del
12-15 de septiembre de 2026. Complementa, no sustituye: SPEC.md §7 sigue
siendo la fuente de verdad de la arquitectura *objetivo* (microservicios);
este documento describe el estado *real* de `apps/bff-web` hoy, y hasta dónde
llega la migración hacia ese objetivo.

Repositorio: [github.com/cluna-8/sanciona-fleet](https://github.com/cluna-8/sanciona-fleet) (privado).

---

## 1. Qué hace la aplicación

Sanciona Fleet centraliza expedientes sancionadores de empresas de transporte
por carretera. `apps/bff-web` es la única interfaz: web responsiva, sin app
móvil nativa. Lo que un usuario puede hacer, por pantalla:

| Pantalla | Ruta | Qué permite | RF relacionados (SPEC.md) |
|---|---|---|---|
| Acceso / alta | `/` | Iniciar sesión (correo o usuario) o darse de alta en autoservicio (datos → tarifa → cuenta) | RF-AUTH-1, RF-AUTH-2 |
| Recuperar contraseña | `/reset-password` | Enlace de un solo uso vía correo | RF-AUTH-2 |
| Panel de control | `/dashboard` | KPIs de la empresa activa (abiertas, pendientes de revisión, plazos a 7 días, importe, ahorro), distribución por estado/categoría, últimos expedientes | RF-INF-1 |
| Sanciones | `/sanciones`, `/sanciones/$id`, `/sanciones/nueva` | Listar y filtrar expedientes, ficha completa (documentos, actuaciones, comentarios, análisis, plazos, borradores), alta manual o desde documento (IA) | RF-ALTA-1..5, RF-PLAZO-* |
| Vehículos / Conductores | `/vehiculos*`, `/conductores*` | Alta, edición, ficha con histórico de sanciones asociadas | RF-FLOTA-1..3 |
| Documentos | `/documentos` | Repositorio de todo lo subido, filtrable, descarga con enlace firmado temporal | RF-DOC-1 |
| Borradores | `/borradores/$id` | Editor de alegaciones/recursos generados por IA, versionado, validación exclusiva del revisor jurídico | RF-BORRADOR-1..3 |
| Avisos | `/avisos` | Notificaciones internas (plazos, documentación pendiente, análisis listo) | RF-AUTH-3 |
| Informes / Prevención / Calendario | `/informes`, `/prevencion`, `/calendario` | Analítica de resultados y vencimientos | RF-INF-*, RF-PREV-* |
| Empresa / Usuarios | `/empresa`, `/empresa-nueva`, `/usuarios` | Datos fiscales, miembros, roles, invitaciones | RF-AUTH-1, identity |
| Superadmin | `/superadmin` | Visión global de todas las organizaciones (solo superadministrador de plataforma) | — |

Cada expediente sigue un ciclo: **alta** (manual o desde documento, con
extracción por IA) → **plazos** calculados por el motor determinista →
**análisis** preliminar por IA (semáforo, recomendación) → **borrador** de
alegaciones/recurso generado por IA → **validación humana obligatoria** por
un revisor jurídico antes de que el borrador pueda presentarse. Ningún
contenido generado por IA se marca como definitivo sin ese paso.

---

## 2. Cómo está construido por dentro

### 2.1 Stack

TanStack Start (React 19, SSR) · TanStack Router (file-based) · TanStack
Query · Tailwind CSS 4 · shadcn/ui (9 componentes realmente usados, podados de
46) · Supabase (Postgres + Auth + Storage) · Zod · Vite 8 + Nitro. Sin
dependencia de Lovable — ver ADR 0002.

### 2.2 Arquitectura modular por *features*

Antes del refactor, cualquier ruta o componente podía llamar directamente a
`supabase.from(...)`: 57 llamadas repartidas en 19 archivos, 8 de ellos
pantallas de UI (ver `docs/refactor/PLAN-REFACTOR-FRONTEND.md` §1.2). Hoy:

```
src/
  features/<nombre>/
    api/
      client.ts      # el único archivo que importa supabase de esta feature
      keys.ts         # claves de TanStack Query, centralizadas
      queries.ts      # hooks useQuery
      mutations.ts    # hooks useMutation (validación con Zod incluida)
    model/
      schemas.ts       # esquemas Zod, cuando la feature valida formularios
    index.ts            # única puerta de entrada pública de la feature
  routes/ , components/  # solo importan desde features/*/index.ts — nunca
                          # desde @/integrations/supabase directamente
  shared/
    lib/                  # formato, errores — sin dominio de negocio
    components/            # TarjetaKpi, EstadoCarga, EstadoVacio
```

Diez features, cada una mapeada 1:1 a un servicio objetivo de SPEC.md §7.1:

| Feature | Servicio objetivo (§7.1) | Qué hace hoy |
|---|---|---|
| `auth` | `identity-service` (delegado a Supabase Auth) | Sesión, login, alta de cuenta, recuperación de contraseña |
| `organizacion` | `identity-service` | Empresa activa, miembros, roles, invitaciones |
| `flota` | `fleet-service` | Vehículos y conductores |
| `expedientes` | `sanctions-service` | Listado, ficha, alta manual, estados, comentarios, actuaciones |
| `extraccion` | `extraction-service` | Subida de documento y registro de la extracción por IA |
| `plazos` | `deadlines-service` (ya extraído de verdad, ver §2.3) | Lectura de los plazos ya calculados |
| `analisis` | `analysis-service` | Lectura del análisis y su revisión manual |
| `borradores` | `drafts-service` | Versionado y validación de escritos |
| `documentos` | `documents-service` | Storage y enlaces de descarga |
| `avisos` | `notifications-service` | Notificaciones internas |

**Regla que lo hace cumplir**, no solo lo documenta: `eslint.config.js`
prohíbe con `no-restricted-imports` que cualquier archivo bajo `src/routes/`
o `src/components/` importe `@/integrations/supabase/*` o
`@supabase/supabase-js`. Un intento de saltarse la capa de features rompe la
build de CI, no solo la revisión de código.

**Lo que esto NO es todavía**: excepto `deadlines-service`, ninguna de estas
diez "features" es un microservicio desplegado por separado. `apps/bff-web`
sigue siendo un único proceso que habla con la misma base de datos de
Supabase. La separación por carpetas es la preparación necesaria para el
*strangler fig* de SPEC.md §7.5 paso 5 — extraer `sanctions-service` mañana
significa mover `features/expedientes/api/client.ts` a un Worker nuevo y
sustituir sus llamadas a Supabase por RPC, sin tocar ninguna ruta ni
componente. Antes del refactor, ese mismo cambio habría exigido tocar 8
pantallas distintas.

### 2.3 Lo único ya extraído de verdad: `deadlines-service`

`services/deadlines-service` es un Worker de Cloudflare independiente, sin
base de datos ni llamadas externas (lógica pura, 100 % determinista, 16 tests
en `plazos.test.ts`). `apps/bff-web` no calcula plazos: se los pide por HTTP
(`lib/deadlines-client.server.ts`, variable `DEADLINES_SERVICE_URL`). Es la
prueba de concepto de que el patrón funciona antes de repetirlo con las otras
diez features.

### 2.4 Contratos compartidos

`packages/contracts` es el único lugar donde se definen los tipos de dominio
(`Sancion`, `Vehiculo`, `Organizacion`, estados, roles…) y los contratos de
`deadlines-service` y `ai-provider`. Antes del refactor estos tipos se
escribían a mano y duplicados en cada hook (`use-datos.ts`, `use-org.ts`).
Cambiar la forma de un dato ahí es hoy un error de compilación en cada
feature que lo consuma, no un `as never` silencioso — el refactor eliminó 50
`as never` y 11 `as unknown as` del código de UI (quedan los estrictamente
necesarios en la frontera con los tipos generados de Supabase).

### 2.5 Lo que queda pendiente de esta migración

Documentado explícitamente para que no se dé por hecho:

1. **`lib/expediente.functions.ts` (760 líneas) sin dividir.** Contiene las
   cinco *server functions* de extracción, análisis y borradores. No se tocó
   porque es lógica con consecuencia legal directa y esta sesión no tuvo
   acceso a un proyecto de Supabase de test para verificar que dividirlo no
   rompe nada — ver `docs/refactor/PLAN-REFACTOR-FRONTEND.md` §1.6 y §3.
2. **Componentes grandes sin descomponer**: `alta-documento.tsx` (589
   líneas, wizard de 4 pasos con 13 `useState`), `sanciones.$id.tsx` (429),
   `routes/index.tsx` (542). Compilan y funcionan igual que antes — solo se
   les cambió de dónde sacan los datos (Etapa 2) — pero siguen siendo un solo
   archivo que mezcla presentación y lógica.
3. **`lib/fleet.ts` y `hooks/use-org.ts` son *shims* de compatibilidad**, no
   la implementación real (que vive en `@sanciona/contracts`,
   `shared/lib/formato.ts` y `features/organizacion`). Se mantienen para no
   tener que tocar los ~15 archivos que aún importan de esas rutas; se
   retiran cuando esos archivos se descompongan.

---

## 3. Cómo correrlo y verificarlo

```sh
bun install                          # raíz del monorepo
cd apps/bff-web && cp .env.example .env   # rellenar con credenciales de Supabase
bun run dev                          # http://localhost:8080
```

```sh
bunx tsc --noEmit && bunx eslint . && bun run build   # dentro de apps/bff-web
bun test                                               # raíz: toda la suite (47 tests)
```

**Stack completo en Docker** (bff-web + deadlines-service, red compartida):

```sh
docker compose up -d --build
# bff-web       http://localhost:8080
# deadlines     http://localhost:8787
```

Ver `docker-compose.yml` y `docs/deploy/ELEA-RUNBOOK.md` para el detalle de
por qué los `Dockerfile` de este stack son de **prueba local**, no de
despliegue a producción (`wrangler dev` no completa el handshake HTTP dentro
del Docker anidado del entorno donde se desarrolló esto; el shim de
`services/deadlines-service/src/local-dev-server.ts` reutiliza exactamente la
misma lógica sobre Bun para poder verificarlo igualmente).

---

## 4. Trazabilidad

Cada commit de este refactor cita la etapa a la que pertenece
(`Etapa 1`..`Etapa 4`, ver `docs/refactor/PLAN-REFACTOR-FRONTEND.md` §4) y
qué se verificó antes de cerrarlo. `git log --grep="Etapa 2"` responde qué
tocó la migración de la capa de datos. El estado agregado vive en
`docs/spec/05-trazabilidad.md` §6.
