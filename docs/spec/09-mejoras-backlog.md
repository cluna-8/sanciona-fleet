# 09 — Mejoras y backlog priorizado

**Fecha:** 2026-09-20 · **Fuente:** auditoría en 4 dimensiones (seguridad, calidad
de código, gaps funcionales vs SPEC, infra/ops) ejecutada en paralelo sobre el
estado actual del repo.

Este documento es el **backlog único** de mejoras, deduplicado y priorizado. Cada
hallazgo cruza las dimensiones donde apareció, cita `file:line`, indica el
requisito afectado (RF/RS de `SPEC.md`), propone un fix y estima esfuerzo.
Sustituye y consolida los reportes de auditoría individuales (no se commitean
por separado).

> **Estado de ejecución (2026-09-20):** la **Fase 1** del
> [`10-plan-hardening-v1.md`](10-plan-hardening-v1.md) (rama
> `fix/hardening-v1-fase1`, commit `19451f1`) resolvió **C-3, A-1, A-4, M-8,
> M-10, M-11 y B-4** (✅) y reevaluó **M-3 y B-7** como **falsos positivos**
> (sin cambio). El resto sigue ⬜ pendiente, en su mayoría a la espera de
> puerta humana o `apply` de terraform (Fase 2). Los contadores de más abajo
> reflejan este estado.

## Convenciones

- **Severidad:** CRÍTICA (bloquea v1 / riesgo legal o de seguridad inminente) ·
  ALTA (rompe funcionalidad o endurece deuda antes de v1) · MEDIA (calidad /
  feature parcial) · BAJA (pule, v2).
- **Dimensiones:** 🔒 seguridad · 🧬 código · 📋 funcional · 🛠️ infra/ops.
- **Esfuerzo:** S (<½ día) · M (1–2 días) · L (>2 días).
- **Estado:** ⬜ pendiente · 🟡 en curso · ✅ hecho · ❌ falso positivo (sin
  cambio). GAP-1 (bucket) ✅; Fase 1 del plan 10 ✅ (7 hallazgos); M-3 y B-7 ❌.

---

## Resumen ejecutivo

| Severidad | Total | Hecho (✅) | Falso positivo (❌) | Pendiente (⬜) | Bloquea v1 |
|---|---:|---:|---:|---:|---|
| CRÍTICA | 4 | 1 (C-3) | 0 | 3 | sí (C-1, C-2, C-4) |
| ALTA | 13 | 2 (A-1, A-4) | 0 | 11 | varias |
| MEDIA | 14 | 3 (M-8, M-10, M-11) | 1 (M-3) | 10 | no |
| BAJA | 12 | 1 (B-4) | 1 (B-7) | 10 | no |

**Avance Fase 1 (plan 10):** 7 de 43 hallazgos resueltos + 2 reevaluados. Quedan
**3 CRÍTICAS** que bloquean v1:

1. **CU-07 alta autoservicio insegura** (C-1) — endpoint público con
   `service_role`, sin captcha, sin verificación de correo, password devuelta
   al navegador y enviada en claro, sin cobro. 0/4 criterios de CU-07.
2. **SSH abierto al mundo (`0.0.0.0/0`)** (C-2) — security group de prod.
3. **Festivos no implementados (RF-PLAZO-5)** (C-4) — sólo 9 festivos nacionales
   fijos; sin Semana Santa, autonómicos ni locales. Bloqueante legal.

Lo demás es deuda de refactor (motor de plazos duplicado, casts `as never`,
QueryClient sin `staleTime`), hardening (rate limit IA, RLS defense-in-depth,
rotación de secretos, backups, monitorización) y features parciales
(export PDF/docx reales, invitaciones por email, paginación, soft-delete de
flota). La IA, los KPIs del dashboard y la prevención **son reales, no mocks**.

---

## CRÍTICAS

### C-1 · CU-07 alta autoservicio insegura 🔒📋
- **Afecta:** RF-ALTA-EMPRESA-2/3/4/5, CU-07 (0/4 criterios cumplidos)
- **Dónde:** `apps/bff-web/src/lib/alta.functions.ts:36-147`;
  `apps/bff-web/src/routes/index.tsx:21` (ruta pública, sin `_authenticated`);
  `apps/bff-web/src/lib/email.server.ts:57`
- **Qué falla:** `crearAlta` es una server fn pública que usa `supabaseAdmin`
  (`service_role`) para `admin.createUser({ email_confirm: true })` — crea el
  usuario verificado sin probar el correo. La password generada se devuelve en
  la respuesta HTTP (l.143) **y** se envía en claro por email (l.126-137,
  `plantillaCredenciales`). El plan se guarda gratis (l.98,117) sin pasarela
  ni cobro. No hay captcha, rate limit ni protección alguna.
- **Fix:** (1) Turnstile/captcha + rate limit por IP en la server fn; (2)
  flujo de confirmación por enlace mágico de un solo uso (no
  `email_confirm:true`); (3) **no devolver ni enviar la password** — enlace
  para que el usuario establezca su contraseña; (4) `billing-service` +
  pasarela de pago; no activar la empresa hasta cobro confirmado. Mientras
  tanto, **desactivar el botón "Contratar" en prod** o proteger la ruta.
- **Esfuerzo:** L (cambia el flujo de onboarding completo).

### C-2 · SSH abierto al mundo (`0.0.0.0/0`) 🔒🛠️
- **Afecta:** infra de prod
- **Dónde:** `infra/aws/variables.tf:30-34` (`ssh_cidr_blocks` default
  `["0.0.0.0/0"]`); `infra/aws/sg.tf:33-39`
- **Qué falla:** el security group permite SSH (22) desde cualquier IP. Brute
  force expuesto en una instancia con rol OIDC y acceso a SSM/Supabase.
- **Fix:** restringir `ssh_cidr_blocks` a la IP/bloque del operador (o
  eliminar SSH y usar Session Manager / SSM). `terraform plan/apply`.
- **Esfuerzo:** S (cambio terraform + apply).

### C-3 · Alta manual (CU-02) sin botón submit — RF-ALTA-2 roto ✅ 🧬📋
- **Afecta:** RF-ALTA-2, CU-02
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** Añadido botón
  `type="submit"` e `<input type="file">` para adjuntar la notificación.
- **Dónde:** `apps/bff-web/src/routes/_authenticated/sanciones.nueva.tsx:109-248`
- **Qué falla:** el `<form onSubmit>` llama a `crear.mutate`, pero **no existe
  ningún `<Button type="submit">`** dentro del form. El único botón es el de
  `AltaDesdeDocumento` (externo al form). El alta manual es inalcanzable por
  teclado/ratón; `crear.isPending` nunca se muestra. Bug heredado de Lovable
  (mismo fichero en ambos — paridad neutra, pero hay que arreglarlo).
- **Fix:** añadir `<Button type="submit" disabled={crear.isPending}>
  {crear.isPending ? <Loader2/> : null} Registrar expediente</Button>` dentro
  del form. `Loader2` y `Button` ya se importan.
- **Esfuerzo:** S.

### C-4 · Festivos no implementados (RF-PLAZO-5) 📋
- **Afecta:** RF-PLAZO-5 (puerta humana bloqueante v1, `07-plan-de-pruebas.md` §3)
- **Dónde:** `services/deadlines-service/src/plazos.ts:28-48` (Set
  `FESTIVOS_FIJOS` con 9 festivos nacionales de fecha fija);
  `apps/bff-web/src/lib/plazos.ts` replica el mismo Set.
- **Qué falla:** no hay Semana Santa/Pascua (móviles), ni autonómicos, ni
  locales. `esHabil()` sólo consulta ese Set. No hay parámetro de
  provincia/municipio en `EntradaPlazos` ni fuente de festivos. Un plazo mal
  calculado le cuesta dinero a un transportista.
- **Fix:** fuente de festivos por CCAA/municipio (API oficial o calendario
  mantenido), cómputo de Pascua, pasar provincia/municipio a `EntradaPlazos`,
  y validación jurídica (puerta humana). Documentar la fuente en
  `docs/spec/04-modelo-datos.md`.
- **Esfuerzo:** L (fuente + integración + validación legal).

---

## ALTAS

### A-1 · Consultas de expediente sin filtro `organization_id` (RS-2) ✅ 🔒📋
- **Afecta:** RS-2 (defense-in-depth)
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** Filtro
  `.eq("organization_id", orgId)` (orgId opcional → retrocompatible) en las 4
  consultas; el update de estado también filtra por org. `queries.ts` y
  `sanciones.$id.tsx` pasan `orgId`. RLS ya protegía; esto es defense-in-depth.
- **Dónde:** `apps/bff-web/src/features/expedientes/api/client.ts:17-57`
  (`fetchSancion`, `fetchActuaciones`, `fetchComentarios`,
  `cambiarEstadoSancion`)
- **Qué falla:** las 4 consultas filtran sólo por `id`/`sanction_id`, sin
  `.eq("organization_id", orgId)`. Hoy la única defensa es RLS; si una policy
  se relaja, hay fuga entre tenants.
- **Fix:** añadir `.eq("organization_id", orgId)` en las 4 consultas (igual
  que `fetchSanciones` ya lo hace).
- **Esfuerzo:** S.

### A-2 · 5 server functions sin validación Zod 🔒🧬
- **Afecta:** hardening de entrada a IA/DB
- **Dónde:** `apps/bff-web/src/lib/expediente.functions.ts:62,218-229,406,579,707`
  (`procesarDocumento`, `crearExpedienteDesdeExtraccion`, `analizarExpediente`,
  `generarBorrador`, `recalcularPlazos`)
- **Qué falla:** `inputValidator` es un type-cast; campos libres y `kind`
  llegan a la DB y a los prompts del LLM sin validar. Inyección de prompt y
  inserts mal tipados.
- **Fix:** esquema Zod por server fn (en `@sanciona/contracts` o local),
  validar antes de procesar. Reusa los tipos `Database` de
  `src/integrations/supabase/types.ts`.
- **Esfuerzo:** M.

### A-3 · Sin rate limiting / presupuesto por org en IA 🔒🛠️
- **Afecta:** coste, abuso, robustez
- **Dónde:** `packages/ai-provider/src/proveedores/openai-compatible.ts:43-72`;
  errores mapeados en `packages/ai-provider/src/errores.ts:56`
- **Qué falla:** no hay rate limit, ni presupuesto por organización, ni
  backoff en 429, ni registro de `usage` (tokens). Un tenant puede vaciar la
  cuota de OpenRouter.
- **Fix:** rate limit por org + presupuesto configurable por plan (ADR 0004
  D-4/D-5), backoff exponencial en 429, log de `usage` para facturación.
- **Esfuerzo:** M.

### A-4 · `sanction_actions.insert` fire-and-forget — auditoría silenciosa ✅ 🧬
- **Afecta:** trazabilidad regulatoria
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** Los 3 inserts de
  auditoría ahora chequean `error` y hacen `throw` (`if (eAudit) throw eAudit`).
- **Dónde:** `apps/bff-web/src/features/expedientes/api/client.ts:58-64`
  (`cambiarEstadoSancion`); `apps/bff-web/src/features/borradores/api/client.ts:88-94,116-122`
  (`guardarNuevaVersion`, `cambiarEstadoBorrador`)
- **Qué falla:** el insert de auditoría en `sanction_actions` se ignora (sin
  chequear `error`). Si falla, el historial del expediente pierde la traza del
  cambio de estado sin aviso.
- **Fix:** `const { error: eAudit } = await …; if (eAudit) throw eAudit;` o,
  si no se quiere bloquear al usuario, `reportError` + `toast.warning`.
- **Esfuerzo:** S.

### A-5 · Motor de plazos duplicado y muerto (RF-PLAZO-3) 🧬📋
- **Afecta:** RF-PLAZO-3
- **Dónde:** `apps/bff-web/src/lib/plazos.ts:82-296` (296 líneas, motor
  completo) vs `services/deadlines-service/src/plazos.ts` (253 líneas, casi
  idéntico). El cálculo real ahora vive en el microservicio y se invoca vía
  `calcularPlazosRemoto` (`src/lib/deadlines-client.server.ts:15`).
- **Qué falla:** de `lib/plazos.ts` sólo se usan los tipos `EntradaPlazos`,
  `EstadoPlazo`, `CLASES_ESTADO_PLAZO`; el motor (`calcularPlazos`,
  `sumarDias*`, `REGLAS`) está muerto pero **duplica la lógica jurídica** →
  deriva silenciosa. El cálculo de "plazo relevante" además está triplicado
  en `dashboard.tsx:24-28`, `sanciones.index.tsx:28-33`, `sanciones.$id.tsx:108`.
- **Fix:** mover tipos/constantes UI a `@sanciona/contracts` (ya expone
  `EntradaPlazos`, `PlazoCalculado`, `EstadoPlazo`, `TipoPlazo`); borrar el
  motor local; una sola función `plazoRelevante` compartida consumida por las
  3 vistas.
- **Esfuerzo:** M.

### A-6 · Dashboard/calendario/listados leen campos planos, no `sanction_deadlines` (RF-PLAZO-4) 📋
- **Afecta:** RF-PLAZO-4
- **Dónde:** `dashboard.tsx:25`; `calendario.tsx:44-45`; `sanciones.index.tsx:28`;
  `sanciones.$id.tsx:108`. Sólo `panel-analisis.tsx:42` consume
  `usePlazos`/`fetchPlazos`.
- **Qué falla:** las vistas leen `payment_deadline`/`appeal_deadline` planos
  en vez de la tabla `sanction_deadlines` calculada por el microservicio →
  divergencia entre lo que muestra el listado y lo que calculó el servicio.
- **Fix:** consumir `usePlazos`/`fetchPlazos` en todas las vistas.
- **Esfuerzo:** M.

### A-7 · Sin borrado/archivado de flota (RF-FLOTA-2) 📋
- **Afecta:** RF-FLOTA-2
- **Dónde:** sin UI/mutation en `features/flota/` ni rutas `vehiculos`/`conductores`
- **Qué falla:** no existe operación de borrado/archivado; no hay columna
  `deleted_at` en migraciones.
- **Fix:** soft-delete (`deleted_at`/`archived`) + mutation + botón en UI.
- **Esfuerzo:** M.

### A-8 · Sin paginación server-side (RF-PERF-1) 📋
- **Afecta:** RF-PERF-1
- **Dónde:** `features/expedientes/api/client.ts:8-13`; `features/flota/api/client.ts`
- **Qué falla:** `useSanciones`/`useVehiculos`/`useConductores` cargan todo sin
  `.range()`/`limit`. Para flotas grandes pesa.
- **Fix:** `.range()` + `page` param + contador total.
- **Esfuerzo:** M.

### A-9 · Fichas de flota cargan la lista completa (RF-PERF-2) 📋
- **Afecta:** RF-PERF-2
- **Dónde:** `vehiculos.$id.tsx:20`; `conductores.$id.tsx:20`
- **Qué falla:** `useVehiculos(orgId)`/`useConductores(orgId)` cargan todo y
  filtran por id en cliente. No existe `fetchVehiculo(id)`.
- **Fix:** `fetchVehiculo(id)`/`fetchConductor(id)` por id.
- **Esfuerzo:** S.

### A-10 · E2E no corre en CI 🛠️
- **Afecta:** gate de regresión
- **Dónde:** `.github/workflows/ci.yml` (sin step E2E)
- **Qué falla:** la suite Playwright (28 specs, `08-paridad-lovable.md`) es
  manual. Un cambio puede romper paridad sin que CI avise.
- **Fix:** job `e2e` en `workflow_dispatch` (manual, no en cada push: evita
  gastar OpenRouter y crear datos en prod) + smoke mínimo no-IA en cada PR.
- **Esfuerzo:** M.

### A-11 · Sin backups de DB 🛠️
- **Afecta:** continuidad de servicio
- **Dónde:** n/a (no configurado)
- **Qué falla:** Supabase prod sin política de backups/PITR verificada.
- **Fix:** habilitar PITR + backups diarios en Supabase; documentar RTO/RPO
  en `docs/spec/06-arquitectura-bff-web.md`.
- **Esfuerzo:** S (config) + puerta humana (coste).

### A-12 · Secretos sin rotación; RESEND como `String` no `SecureString` 🛠️🔒
- **Afecta:** gestión de secretos
- **Dónde:** `infra/aws/ssm.tf` (`RESEND_API_KEY` declarado `String`,
  valor `"PENDIENTE-RELLENAR"`); sin rotation policy.
- **Qué falla:** secretos en texto plano en SSM; sin rotación.
- **Fix:** migrar a `SecureString`; rotación periódica; nunca commitear
  valores. Rellenar `RESEND_API_KEY`/`EMAIL_FROM` reales.
- **Esfuerzo:** S.

### A-13 · Sin monitorización / uptime / Sentry 🛠️
- **Afecta:** observabilidad
- **Dónde:** n/a
- **Qué falla:** no hay Sentry/error tracking, métricas, ni uptime check. Un
  error 500 en prod pasa desapercibido.
- **Fix:** Sentry (errors + performance) en `apps/bff-web`; uptime check
  (Cloudflare worker o UptimeRobot); métricas mínimas (LCP, tasa de error).
- **Esfuerzo:** M.

---

## MEDIAS

### M-1 · Export PDF = `window.print()`; .doc = Blob HTML (RF-BORRADOR-3/4) 🧬📋
- **Dónde:** `apps/bff-web/src/routes/_authenticated/borradores.$id.tsx:103-122`
- **Qué falla:** "Exportar a PDF" abre `window.print()` (no genera PDF); el
  "descargar editable" es HTML renombrado a `.doc` (no OOXML). El HTML no
  incluye cabecera de empresa, expediente, fecha ni firma.
- **Fix:** PDF server-side (`@react-pdf/renderer` o puppeteer en server fn →
  subir a `sanction-documents` → `signedUrl`); `.docx` real con la librería
  `docx` en server fn. Skill `pdf-official`.
- **Esfuerzo:** M.

### M-2 · Invitaciones no envían email (RF-AUTH-3) 📋
- **Dónde:** `apps/bff-web/src/features/organizacion/api/mutations.ts:60-80`
- **Qué falla:** `useCrearInvitacion` sólo hace INSERT en
  `organization_invitations`; no llama a `enviarCorreo`. Sin UI ni plantilla
  de invitación.
- **Fix:** llamar `enviarCorreo` con plantilla de invitación (enlace de un
  solo uso); confirmar `EMAIL_FROM` con dominio propio.
- **Esfuerzo:** M.

### M-3 · `recommended_action` calculado pero no mostrado (RF-ANALISIS-3) ❌ 📋
- **Estado:** ❌ **Falso positivo (reevaluado en Fase 1).** `panel-analisis.tsx:202-220`
  **ya renderiza** `analisis.recommendation` con cabecera "Acción recomendada",
  rationale y próximo paso. El auditor grepó el nombre de columna
  `recommended_action`, pero el contrato lo expone como `recommendation`. Sin
  cambio.
- **Dónde:** `apps/bff-web/src/lib/expediente.functions.ts:547`;
  `components/panel-analisis.tsx`

### M-4 · `/documentos` no permite subir (RF-DOC-1) 📋
- **Dónde:** `apps/bff-web/src/routes/_authenticated/documentos.tsx`
- **Qué falla:** sólo lista y descarga. `subirDocumento` existe en
  `features/documentos/api/client.ts:36` pero no se invoca desde `/documentos`
  (sí desde `alta-documento`).
- **Fix:** añadir UI de upload + reusar `subirDocumento`.
- **Esfuerzo:** S.

### M-5 · Email: plantilla enlaza `/auth` viejo; `PUBLIC_SITE_URL` sin default seguro (RF-EMAIL-2) 📋
- **Dónde:** `apps/bff-web/src/lib/email.server.ts:59`; `routes/alta.tsx`
- **Qué falla:** la plantilla enlaza `${url}/auth` (flujo viejo);
  `PUBLIC_SITE_URL` (`alta.functions.ts:121`) sin valor por defecto seguro.
- **Fix:** plantilla a la ruta vigente; default `PUBLIC_SITE_URL` no Lovable.
- **Esfuerzo:** S.

### M-6 · Resend sin configurar (RF-EMAIL-1) 📋
- **Dónde:** `apps/bff-web/src/lib/email.server.ts:10-13`
- **Qué falla:** sin `RESEND_API_KEY` → `enviado:false`; `EMAIL_FROM` default
  `onboarding@resend.dev` (dominio Resend, no propio).
- **Fix:** configurar `RESEND_API_KEY`, dominio verificado, `EMAIL_FROM`
  propio. Puerta humana: DPA.
- **Esfuerzo:** S (config) + puerta humana.

### M-7 · Errores tragados en alta de empresa 🧬
- **Dónde:** `apps/bff-web/src/lib/alta.functions.ts:62,68-77,104,108-118`
- **Qué falla:** `console.error` sin detalle al operador; upserts/inserts de
  profile/member/plan fire-and-forget sin chequear `error`.
- **Fix:** devolver mensaje técnico en campo `detalle` (logs/Sentry) o
  `reportError`; chequear los `error` de cada paso.
- **Esfuerzo:** S.

### M-8 · `enlaceDescarga` descarta el error de Storage ✅ 🧬
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** Loguea el error de
  Storage (mensaje + ruta) antes de retornar null.
- **Dónde:** `apps/bff-web/src/features/documentos/api/client.ts:56-60`
- **Qué falla:** `if (error || !data?.signedUrl) return null;` descarta el
  error (RLS, path, expiración) sin log.
- **Fix:** `if (error) reportError(error, …);` antes de retornar null.
- **Esfuerzo:** S.

### M-9 · 64 casts `as never` / `as unknown as` pese a tener `Database` tipado 🧬
- **Dónde:** `features/expedientes/api/client.ts:14,24,44`;
  `features/organizacion/api/client.ts:58,71,93,133,166`;
  `lib/expediente.functions.ts:178-180,316,531-536,…`; `components/alta-documento.tsx:108,258,501`
- **Qué falla:** silencia errores de esquema; inserts mal tipados no se
  detectan en compile, pese a que el cliente se crea con
  `createClient<Database>`.
- **Fix:** importar `Database["public"]["Tables"]["X"]["Row"]` /
  `TablesInsert<"sanctions">`; eliminar los casts. Migrar tipos de dominio a
  `@sanciona/contracts`.
- **Esfuerzo:** M.

### M-10 · QueryClient sin `defaultOptions`; `defaultPreloadStaleTime: 0` ✅ 🧬
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** `QueryClient` con
  `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1` y
  `defaultPreloadStaleTime: 30_000`.
- **Dónde:** `apps/bff-web/src/router.tsx:6-11`
- **Qué falla:** sin `staleTime` global → cada mount refetchea;
  `defaultPreloadStaleTime: 0` anula el preload. Sólo `organizacion` pone
  `staleTime` (sesión 30s, esSuperadmin 5min).
- **Fix:** `new QueryClient({ defaultOptions: { queries: { staleTime:
  30_000, refetchOnWindowFocus: false } } })`; subir `defaultPreloadStaleTime`
  a 30_000. Ajustar por query.
- **Esfuerzo:** S.

### M-11 · Botones de icono sin `aria-label` (a11y) ✅ 🧬
- **Estado:** ✅ **Hecho (Fase 1, commit `19451f1`).** `aria-label` en los
  chevrons del calendario y en el botón de eliminar invitación, con
  confirmación antes de eliminar.
- **Dónde:** `apps/bff-web/src/routes/_authenticated/calendario.tsx:85,88`;
  `usuarios.tsx:256-261`
- **Qué falla:** botones `<ChevronLeft/>`/`<ChevronRight/>` y `<Trash2/>` sin
  `aria-label` (lector de pantalla lee "botón" sin acción). El de eliminar
  además sin confirmación.
- **Fix:** `aria-label="Mes anterior"`/`"Mes siguiente"`/`"Eliminar invitación
  de {email}"` + confirm en eliminar.
- **Esfuerzo:** S.

### M-12 · KPIs de flota O(n·m) en cliente 🧬
- **Dónde:** `conductores.index.tsx:45,146`; `vehiculos.index.tsx:45,168`;
  `conductores.$id.tsx:21`
- **Qué falla:** cargan TODAS las sanciones de la org y filtran en memoria por
  `driver_id`/`vehicle_id`. 1 query, pero O(n·m) y transfiere todo.
- **Fix:** RPC/vista en Supabase (`vehicle_kpis(org_id)`,
  `driver_kpis(org_id)`) que devuelva conteos e importes agregados.
- **Esfuerzo:** M.

### M-13 · No se fuerza rotación de credenciales migradas (RF-AUTH-4) 📋
- **Dónde:** `routes/reset-password.tsx`; `features/auth/api/client.ts:50`
- **Qué falla:** existe reset, pero no se fuerza cambio al primer login de
  credenciales migradas.
- **Fix:** flag `must_change_password` + flujo forzado al primer login.
- **Esfuerzo:** S.

### M-14 · `municipality` sólo lo rellena la IA (RF-PREV-2) 📋
- **Dónde:** `apps/bff-web/src/routes/_authenticated/prevencion.tsx:65`;
  `sanciones.nueva.tsx`
- **Qué falla:** el agrupado por municipio depende de `municipality`, que sólo
  llena la extracción IA; el alta manual no tiene el campo → expedientes
  manuales nunca aparecen en el agrupado por zonas.
- **Fix:** capturar `municipality` en alta manual o excluir del agrupado.
- **Esfuerzo:** S.

---

## BAJAS (pule, v2)

| # | Título | Dónde | Fix | Esf. |
|---|---|---|---|---|
| B-1 | `<Label>` sin `htmlFor`/asociación | `sanciones.nueva.tsx:263-269`; `alta-documento.tsx:390,506,545,561` | `id` al input + `htmlFor` al Label | S |
| B-2 | `<th>` sin `scope="col"`, tablas sin `<caption>` | múltiples `routes/_authenticated/*` | `scope` + caption | S |
| B-3 | `src/lib/fleet.ts` shim `@deprecated` (22 consumidores) | `src/lib/fleet.ts:1` | migrar importadores a `@sanciona/contracts` / `@/shared/lib/formato` | M |
| B-4 | ✅ `useCambiarEstado` no invalida `analisis`/`plazos` | `features/expedientes/api/mutations.ts:24-28` | invalidar `analisisKeys.deSancion(id)`, `plazosKeys.deSancion(id)` — **hecho Fase 1** | S |
| B-5 | Sin `manualChunks` para vendors | `vite.config.ts` | `@tanstack/*`, `@supabase/supabase-js` en chunk estable | S |
| B-6 | Sin diff real entre versiones (RF-BORRADOR-5) | `borradores.$id.tsx:142,208-216` | lib `diff` | M |
| B-7 | ❌ "Restaurar" no guarda (RF-BORRADOR-6) | `borradores.$id.tsx:222` | **falso positivo:** el botón dice "Restaurar este texto en el editor" y hace eso (carga el texto para editar y guardar versión) | S |
| B-8 | `sanction_outcomes` vacío, sin analítica (RF-INF-2) | sin UI | punto de escritura al resolver + analítica | L |
| B-9 | `document_access_logs` sin log (RF-DOC-2) | sin UI | INSERT al descargar/ver | S |
| B-10 | Integraciones DGT/DIR3 (sin RF) | `integration_endpoints` vacía | definir RF + clientes | L |
| B-11 | Informe PDF (sin RF) | `informes.tsx` (sólo CSV) | generador PDF | M |
| B-12 | `resolverIdentificador` enumeración 🔒 | `features/auth/…` | rate limit + respuesta genérica | S |

---

## Lo que está bien (no tocar)

Verificado por las 4 auditorías — destacar para no regredir:

- **IA real, no mock:** extracción (`expediente.functions.ts:90`), análisis
  (`:497`), borrador (`:614`) llaman a OpenRouter vía `@sanciona/ai-provider`.
- **KPIs del dashboard reales:** `dashboard.tsx:35-50` computa abiertas,
  pendientes, plazos en 7 días, importe, ahorro pronto pago.
- **Prevención real:** `prevencion.tsx:77-103` calcula patrones sobre
  sanciones reales.
- **Code-splitting por ruta** activo (73 chunks en build); iconos lucide con
  named imports (tree-shakeable).
- **`queryKey` centralizados** y estables en `features/*/api/keys.ts`.
- **`fetchMiembros`** usa batched `.in()` (no N+1).
- **`.maybeSingle()/.single()`** chequean error; server fns de
  extracción/análisis hacen `throw` y persisten `error_message`.
- **`multas-export/`** no se referencia desde el BFF (sólo paridad E2E).
- **RLS** en las 22 tablas + policies Storage correctas; bucket
  `sanction-documents` creado (GAP-1 ✅).
- **CI** con gate `verificar` (typecheck+lint+build+`bun test`) que bloquea
  deploy si falla; `concurrency` por rama.

---

## Plan de ataque sugerido

> **Fase 1 (pasos 1–2 parcial + calidad/quick wins) ya ejecutada** — ver
> [`10-plan-hardening-v1.md`](10-plan-hardening-v1.md), rama
> `fix/hardening-v1-fase1`, commit `19451f1`. Hechos: C-3, A-1, A-4, M-8, M-10,
> M-11, B-4. Falsos positivos: M-3, B-7. Lo pendiente:

1. ~~**Quick wins de seguridad (S):** C-2 (SSH), A-1 (org_id), A-4 (auditoría),
   A-12 (SecureString).~~ **A-1 y A-4 ✅ hechos.** C-2 y A-12 siguen pendientes
   — son `apply` de terraform en prod, **necesitan tu autorización explícita**.
2. ~~**Arreglar CU-02 (S):** C-3 (botón submit)~~ ✅ **hecho** — alta manual
   operativa.
3. **Endurecer CU-07 (L):** C-1 — mientras tanto, desactivar "Contratar" en
   prod o proteger la ruta. **Puerta de producto/precios.**
4. **Festivos (L):** C-4 — **puerta jurídica**; paralelo a lo demás.
5. **Refactor plazos (M):** A-5 + A-6 + B-3 — una vez, elimina la deriva. Hacer
   con E2E CU-03 verde cubriéndolo.
6. **Rendimiento flota (M):** A-8 + A-9 + M-12.
7. **Features parciales (M):** M-1 (PDF/docx), M-2 (invitaciones), M-4 (upload
   documentos). (M-3 ❌ falso positivo.)
8. **Calidad (M):** M-9 (casts), A-2 (Zod), A-3 (rate limit IA). (M-10 ✅ hecho.)
9. **Ops (M):** A-10 (E2E en CI), A-11 (backups), A-13 (Sentry/uptime).
10. **BAJAS:** backlog v2. (B-4 ✅, B-7 ❌.)

Relacionado: `10-plan-hardening-v1.md` (plan de ejecución + Fase 2),
`08-paridad-lovable.md` (GAPs heredados), `07-plan-de-pruebas.md` (puertas),
`05-trazabilidad.md` (estado por RF).