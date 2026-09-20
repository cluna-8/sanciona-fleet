# 10 — Plan de hardening v1 (ejecución del backlog 09)

**Fecha:** 2026-09-20 · **Rama:** `fix/hardening-v1-fase1` · **Backlog de origen:**
`docs/spec/09-mejoras-backlog.md`.

Este es el **spec de ejecución** que convierte el backlog 09 en cambios
concretos. Separa lo **ejecutable ahora** (código puro, sin apply de terraform
ni puerta humana) de lo que **requiere decisión o apply** y queda documentado
como Fase 2.

## Criterio de "hecho"

Un hallazgo está hecho cuando: (a) el código cambia, (b) la puerta de CI local
pasa (`bun test` + typecheck por paquete + typecheck/lint/build de `bff-web`),
y (c) para los que tocan el flujo crítico del expediente, una re-ejecución E2E
de CU-03/04/05 lo confirma. La Fase 1 no toca el flujo IA; la Fase 2 sí podría.

## Fase 1 — Ejecutable ahora (código puro)

| ID | Hallazgo (09) | Qué se cambia | Estado |
|---|---|---|---|
| C-3 | Alta manual sin botón submit (RF-ALTA-2) | `sanciones.nueva.tsx`: botón `type="submit"` + `<input type="file">` para adjuntar notificación | ✅ |
| A-1 | Consultas de expediente sin `organization_id` (RS-2) | `expedientes/api/client.ts` + `queries.ts` + `sanciones.$id.tsx`: filtro `.eq("organization_id", orgId)` (orgId opcional → retrocompatible); update de estado también filtrado por org | ✅ |
| A-4 | `sanction_actions.insert` fire-and-forget | `expedientes/api/client.ts` + `borradores/api/client.ts`: chequear `error` en los 3 inserts de auditoría | ✅ |
| M-8 | `enlaceDescarga` descarta el error de Storage | `documentos/api/client.ts`: log del error antes de retornar null | ✅ |
| M-10 | QueryClient sin `defaultOptions`; `defaultPreloadStaleTime: 0` | `router.tsx`: `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`, `defaultPreloadStaleTime: 30_000` | ✅ |
| M-11 | Botones de icono sin `aria-label` | `calendario.tsx` (chevrons) + `usuarios.tsx` (eliminar invitación): `aria-label` + confirmación | ✅ |
| B-4 | `useCambiarEstado` no invalida `analisis`/`plazos` | `expedientes/api/mutations.ts`: invalidar `["analisis", id]` + `["plazos", id]` | ✅ |

### Resultado de la puerta de CI local (Fase 1)

- `bun run test` (unitarios, scope `packages services apps/bff-web/src`): **56 pass, 0 fail**.
- Typecheck por paquete (`packages/*`, `services/*`): limpio.
- `apps/bff-web` typecheck + lint + build: limpio (build OK, 0 errores lint).

### Fixes adicionales de bloqueo de CI (heredados del commit E2E `6ee2dff`)

Al correr la puerta de CI local se detectó que **CI estaba rojo** por el trabajo
E2E landado este mismo día (no por Fase 1):

- **`bun test` pisaba los specs de Playwright** (`*.spec.ts` de `e2e/`) y fallaba
  con 8 errores `Playwright Test did not expect test()`. Fix: scope del script
  `test` a `bun test packages services apps/bff-web/src` en `package.json` y
  `bun run test` en `ci.yml`. Los E2E se corren sólo vía `bun run test:e2e`
  (Playwright) / `scripts/run-e2e.sh`.
- **40 errores de prettier** en ficheros E2E + `playwright.config.ts`. Fix:
  `eslint --fix` (formato).
- **8 errores `@typescript-eslint/no-explicit-any`** en `e2e/lib/helpers.ts` y
  `e2e/aislamiento.spec.ts`. Fix: tipo `Fila`/`FilaOrg` en vez de `any`.

Sin estos fixes, cualquier push a `main` habría roto el job `verificar` y
bloqueado deploys. Es deuda del commit E2E, saldada aquí.

### Hallazgos reevaluados (no requieren cambio)

- **M-3 `recommended_action` no mostrado** — **falso positivo.**
  `panel-analisis.tsx:202-220` ya renderiza `analisis.recommendation` con
  cabecera "Acción recomendada", rationale y próximo paso. El auditor grepó
  `recommended_action` (nombre de columna) pero el contrato lo expone como
  `recommendation`.
- **B-7 "Restaurar" no guarda** — **falso positivo** *(reevaluado en Fase 1;
  superseded en la Fase 2c de abajo: la spec RF-BORRADOR-6 pedía
  restaurar-y-guardar y así se implementó — el botón ahora guarda una versión
  nueva, ver backlog 09)*. El botón de entonces decía "Restaurar este texto en
  el editor" y hacía exactamente eso: cargaba el texto
  en el editor para que el usuario lo editara y luego guardara versión.

## Fase 2 — Requiere decisión humana o apply de terraform

### 2a. Infra de prod (terraform apply — necesita tu autorización explícita)

| ID | Hallazgo | Cambio | Bloqueo |
|---|---|---|---|
| C-2 | SSH `0.0.0.0/0` | `infra/aws/variables.tf`: `ssh_cidr_blocks` a la IP del operador, o eliminar SSH y usar Session Manager | 🛑 apply en prod |
| A-12 | `RESEND_API_KEY` como `String` no `SecureString` | `infra/aws/ssm.tf`: `SecureString` + rotación; rellenar valor real | 🛑 apply + secret |

> No se aplica terraform sin tu autorización explícita (infra compartida de
> prod). El código terraform se puede preparar en la rama y dejar el `apply`
> para que tú lo dispares.

### 2b. Puertas humanas bloqueantes v1 (ADR 0004)

| ID | Hallazgo | Puerta |
|---|---|---|
| C-4 | Festivos no implementados (RF-PLAZO-5) | **Jurídica** — fuente de festivos por CCAA/municipio + cómputo Pascua + validación de un abogado |
| C-1 | CU-07 alta autoservicio insegura | **Producto/precios** — rediseño del onboarding (captcha, magic-link, no devolver password, billing-service + pasarela). Mientras tanto: desactivar "Contratar" en prod o proteger la ruta |
| M-6 | Resend sin configurar | **DPA + coste** — `RESEND_API_KEY`, dominio verificado, `EMAIL_FROM` propio |

### 2c. Refactor / features (código, mayor blast radius o necesita E2E)

| ID | Hallazgo | Nota |
|---|---|---|
| A-2 | 5 server fns sin Zod | ✅ **Hecho 20 sep (rama `fix/borradores-export-ia`, commit `8f02af4`)** — 6 esquemas Zod + helper `validar()`, strip de claves desconocidas |
| A-3 | Sin rate limiting / presupuesto IA | ✅ **Hecho 20 sep (commits `a94bcbe` + `17ff0c7`)** — reintentos con backoff/`Retry-After` (tope 15 s) + cuota diaria por org con `ai_usage_logs` y log de tokens; presupuesto por plan inactivo hasta la puerta de precios |
| A-5 | Motor de plazos duplicado y muerto | Borrar `lib/plazos.ts` motor; tipos a `@sanciona/contracts`. **Riesgo de refactor** — hacer con E2E CU-03 verde |
| A-6 | Dashboard/calendario/listados leen campos planos | Consumir `usePlazos` en las 4 vistas |
| A-7 | Sin soft-delete de flota (RF-FLOTA-2) | Migración `deleted_at` + mutation + UI |
| A-8/A-9 | Sin paginación / fichas cargan lista completa | `.range()` + `fetchVehiculo(id)` |
| A-10 | E2E no corre en CI | Job `workflow_dispatch` + smoke no-IA en PR |
| A-11 | Sin backups DB | Config Supabase PITR (coste) |
| A-13 | Sin Sentry/uptime | Cuenta + integración |

### 2c — Ejecutado (20 sep 2026, rama `fix/borradores-export-ia`)

La auditoría de CU-01/CU-05 ("OCR y generación de documentación ¿están bien
hechas?") dictaminó: redacción bien, exportación rota. La ejecución cubre lo
que tocaba el flujo IA/borradores — junto con los fixes de borradores que la
misma auditoría pidió (M-1, B-6, B-7, ver backlog 09):

| ID | Commit | Qué |
|---|---|---|
| M-1 / B-6 / B-7 | `8499b8f`…`1577dcf` | Export real PDF (`pdf-lib`) y .docx (lib `docx`) archivados en Storage + signedUrl; diff real (lib `diff`) entre versión y última; "Restaurar y guardar versión" crea versión nueva |
| A-2 | `8f02af4` | Zod en las 6 server fns de expediente/borradores |
| A-3a | `a94bcbe` | Reintentos con backoff + `Retry-After`, tope 15 s, en `ProveedorBase` |
| A-3b | `17ff0c7` | Cuota diaria por org + `ai_usage_logs` (migración `20260920185007`, append-only, fail-open) |

**Puerta de CI local:** 103 unitarios pass (56 → 103), typecheck por paquete
limpio, `bff-web` lint/build limpios; smoke del bundle Nitro+Bun OK
(pdf-lib/docx/diff solo al bundle server). **Pendiente con confirmación:**
aplicar la migración a prod (antes de desplegar el código), re-corrida E2E
CU-03/04/05 (gasta tokens), merges.
| M-1 | Export PDF/docx reales | Server fn + `@react-pdf/renderer` / lib `docx` |
| M-2 | Invitaciones no envían email | `enviarCorreo` en `crearInvitacion` + plantilla |
| M-4 | `/documentos` no permite subir | UI upload reusando `subirDocumento` |
| M-7 | Errores tragados en alta | Chequear upserts/inserts de profile/member/plan |
| M-9 | 64 casts `as never` | Migrar a tipos `Database`/`TablesInsert` |
| M-12 | KPIs flota O(n·m) en cliente | RPC `vehicle_kpis`/`driver_kpis` (migración) |
| M-13 | No rotación credenciales migradas | Flag `must_change_password` + flujo forzado |
| M-14 | `municipality` sólo lo rellena IA | Campo en alta manual (toca schema + mutation) |
| B-1 | `<Label>` sin `htmlFor` en `Campo` | Requiere wiring de `id` por campo (Input/Select Radix); aplazado para no regredir Select sin E2E que lo cubra |
| B-2…B-12 | BAJAS | Backlog v2 |

## Orden de ejecución de Fase 1

1. C-3 (arregla CU-02 — la CRÍTICA funcional).
2. A-4 + A-1 (seguridad, en `expedientes`/`borradores`).
3. M-10 (perf, `router.tsx`).
4. M-8 (`documentos`).
5. M-11 (a11y, `calendario` + `usuarios`).
6. B-1 (`sanciones.nueva` Campo).
7. B-4 (`expedientes` mutations).
8. **Puerta de CI local:** `bun test` + typecheck por paquete + typecheck/lint/build de `bff-web`.
9. Commit en `fix/hardening-v1-fase1`.

Relacionado: `09-mejoras-backlog.md` (backlog), `07-plan-de-pruebas.md` (puerta
CI/E2E), `08-paridad-lovable.md` (CU-02 bug heredado).