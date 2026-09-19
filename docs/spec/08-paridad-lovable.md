# 08 — Matriz de paridad Lovable ↔ bff-web

**Fecha:** 2026-09-20 · **Prod probado:** `https://sancionafleet.fexia.es` ·
**Cuenta:** `cristian@sanciona-fleet.com` (org `cristian`, `platform_admin`)

## Contexto

`apps/bff-web` **es el código de Lovable migrado** (strangler-fig sobre
`multas-export/`, congelado 18 sep 2026). La superficie de features es ~1:1:
mismas 22 rutas, mismos server functions, mismas 22 tablas, mismos flujos. La
verificación de paridad se hace con la **suite E2E Playwright** de
`apps/bff-web/e2e/` ejecutada contra prod en vivo (no sólo inspección de
código).

**Diff de fuente** (`apps/bff-web/src` vs `multas-export/src`): bff-web
reorganiza el código en `features/{dominio}/{api,model}` (126 ficheros) y
mantiene sólo los primitivos shadcn que usa; multas-export (117 ficheros)
incluye todos los primitivos shadcn generados. **No hay divergencia
funcional** — es una refactorización, no una pérdida de features.

## Cómo reproducir

```bash
# Specs no-IA (auth, rutas, flota, CU-02, CU-06, superadmin, secundarias)
bash scripts/run-e2e.sh e2e/rutas.spec.ts e2e/flota.spec.ts \
  e2e/sancion-manual.spec.ts e2e/superadmin.spec.ts \
  e2e/informes-avisos.spec.ts e2e/aislamiento.spec.ts --reporter=list

# Specs con IA (OpenRouter real — gastan tokens)
bash scripts/run-e2e.sh e2e/sancion-documento.spec.ts e2e/expediente.spec.ts \
  --reporter=list
```

## Resultados E2E (corrida 2026-09-20)

| Spec | CU / feature | Resultado | Evidencia |
|---|---|---|---|
| `auth.setup.ts` | login UI | ✅ PASS | sesión guardada, /dashboard carga |
| `rutas.spec.ts` | 14 rutas reachables | ✅ PASS 14/14 | todas 200 + sidebar "Sanciones" |
| `flota.spec.ts` | vehículo + conductor CRUD | ✅ PASS 2/2 | alta → listado; cleanup OK |
| `sancion-manual.spec.ts` | **CU-02** alta manual | ⚠️ PASS (documenta bug) | sin botón submit → no crea expediente |
| `superadmin.spec.ts` | /superadmin visión global | ✅ PASS | link "Superadministración" + agregados |
| `informes-avisos.spec.ts` | informes/avisos/calendario/prevención | ✅ PASS 4/4 | CSV presente, empty-states OK, h2 mes |
| `aislamiento.spec.ts` | **CU-06** RLS tenant isolation | ✅ PASS | RLS sólo devuelve sanciones de la org |
| `expediente.spec.ts` CU-03 | plazos (deadlines-service) | ✅ PASS | recalc → 3 plazos con tipo y fecha |
| `expediente.spec.ts` CU-04 | análisis IA (OpenRouter) | ✅ PASS | semáforo + "Confianza: Alto" (6.0s) |
| `expediente.spec.ts` CU-05 | borrador versionado + export | ✅ PASS | enlace /borradores/{id}, v1→v2, export |
| `sancion-documento.spec.ts` | **CU-01** alta desde documento | ❌ BLOCKED | bucket Storage ausente (ver GAP-1) |

**Resumen:** 27 PASS, 0 FAIL, 1 BLOCKED (CU-01 por infra, no por código).

## Matriz de paridad feature-a-feature

Leyenda de veredicto:
- **PARIDAD OK** — bff-web hace lo mismo que Lovable, probado en vivo.
- **GAP** — diferencia real Lovable↔bff-web que afecta funcionalidad.
- **AMBOS-IGUAL-FALTA** — ambos lo hacen igual y/o incompleto; paridad neutra
  (no es una regresión de la migración, es una limitación heredada).

| Feature | Lovable | bff-web | Veredicto | Spec | Resultado |
|---|---|---|---|---|---|
| Auth login (usuario/email) | ✅ | ✅ | PARIDAD OK | auth.setup | PASS |
| Signup 3 pasos + reset | ✅ | ✅ | PARIDAD OK | rutas | PASS |
| Dashboard / Resumen | ✅ | ✅ | PARIDAD OK | rutas /dashboard | PASS |
| Sanciones listado + filtro | ✅ | ✅ | PARIDAD OK | rutas /sanciones | PASS |
| Detalle de expediente | ✅ | ✅ | PARIDAD OK | expediente | PASS |
| **CU-01** Alta desde documento (PDF→IA→revisión→crear) | ✅ | ✅ código / ❌ prod | **GAP-1 (infra)** | sancion-documento | BLOCKED |
| **CU-02** Alta manual | ⚠️ sin submit | ⚠️ sin submit | AMBOS-IGUAL-FALTA | sancion-manual | PASS (bug) |
| **CU-03** Plazos (deadlines-service) | ✅ | ✅ | PARIDAD OK | expediente CU-03 | PASS |
| **CU-04** Análisis IA (semáforo) | ✅ Gateway | ✅ OpenRouter | PARIDAD OK (proveedor distinto por diseño, ADR) | expediente CU-04 | PASS |
| **CU-05** Borrador versionado + revisor | ✅ | ✅ | PARIDAD OK | expediente CU-05 | PASS |
| **CU-06** Aislamiento entre empresas (RLS) | ✅ | ✅ | PARIDAD OK | aislamiento | PASS |
| **CU-07** Alta autoservicio | ⚠️ inseguro | ⚠️ inseguro | AMBOS-IGUAL-FALTA (hardening) | — | n/a |
| Vehículos CRUD | ✅ | ✅ | PARIDAD OK | flota | PASS |
| Conductores CRUD | ✅ | ✅ | PARIDAD OK | flota | PASS |
| Documentos | ✅ | ✅ | PARIDAD OK | rutas /documentos | PASS |
| Calendario de plazos | ✅ | ✅ | PARIDAD OK | informes-avisos | PASS |
| Informes CSV | ✅ | ✅ | PARIDAD OK | informes-avisos | PASS |
| Prevención (patrones) | ✅ | ✅ | PARIDAD OK | informes-avisos | PASS |
| Avisos (marcar leído) | ✅ | ✅ | PARIDAD OK | informes-avisos | PASS |
| Usuarios / miembros / invitación | ✅ | ✅ | PARIDAD OK | rutas /usuarios | PASS |
| Configuración empresa | ✅ | ✅ | PARIDAD OK | rutas /empresa | PASS |
| Superadmin (visión global) | ✅ | ✅ | PARIDAD OK | superadmin | PASS |
| Tutorial | ✅ | ✅ | PARIDAD OK | rutas /tutorial | PASS |
| Org demo con datos sembrados | ✅ | ✅ | PARIDAD OK (verificado: 5+ sanciones, 5+ vehículos en prod) | — | n/a |
| Export PDF | window.print | window.print | AMBOS-IGUAL-FALTA (no PDF real) | expediente CU-05 | PASS |
| Export .doc | Blob HTML | Blob HTML | AMBOS-IGUAL-FALTA (no docx real) | expediente CU-05 | PASS |
| Plazos: festivos Semana Santa/autonómico/local | ❌ | ❌ | AMBOS-IGUAL-FALTA (RF-PLAZO-5) | — | n/a |
| Email (RESEND) | degrada | degrada | AMBOS-IGUAL-FALTA (sin RESEND_API_KEY) | — | n/a |
| `sanction_outcomes`/`document_access_logs`/`integration_endpoints` (tablas sin UI) | sin UI | sin UI | AMBOS-IGUAL-FALTA | — | n/a |

## GAPs y limitaciones

### GAP-1 (bloqueante, infra — NO código) — Bucket Storage `sanction-documents` ausente en prod

**Síntoma:** CU-01 sube el PDF → "Estado: No se ha podido subir el documento".
La extracción IA no llega a ejecutarse.

**Causa raíz:** Las migraciones definen las **RLS policies** sobre
`storage.objects` para el bucket `sanction-documents`
(`sanction_docs_read/insert/delete/update`, migraciones
`20260825184159` y `20260826191508`) y se aplicaron a prod, pero **ninguna
migración crea la fila del bucket** en `storage.buckets`. Verificado en prod:
`GET /storage/v1/bucket/sanction-documents` → `404 NoSuchBucket`; la lista de
buckets está vacía.

**Fix (pendiente autorización explícita del usuario):** crear el bucket
privado en prod:
- Opción A (Storage API):
  `POST /storage/v1/bucket` con `{"name":"sanction-documents","public":false}`
  usando la service role key.
- Opción B (SQL):
  `insert into storage.buckets (id, name, public) values ('sanction-documents','sanction-documents', false);`
- Y **landar una migración** que lo cree (para que entornos futuros no
  requieran paso manual). Las RLS policies ya están.

El código de upload (`src/features/extraccion/api/client.ts`,
`src/features/documentos/api/client.ts`) y el flujo IA son correctos — el
bloqueo es puramente de provisioning del bucket. Tras crear el bucket, CU-01
debería pasar (la IA ya funciona: CU-04 demostró OpenRouter operativo).

### Limitaciones heredadas (AMBOS-IGUAL-FALTA, no bloquean paridad)

- **CU-02 alta manual sin botón submit:** el `<form>` tiene `onSubmit` que
  llama a `crear.mutate`, pero **no hay `<button type="submit">`** en la UI,
  así que el usuario no puede disparar el alta manual. Presente en Lovable y
  bff-web (mismo fichero `sanciones.nueva.tsx`). Bug preexistente arrastrado,
  no una regresión. **Acción recomendada:** añadir un botón "Crear expediente"
  `type="submit"` en ambos (o al menos en bff-web).
- **Export PDF = `window.print()`; .doc = Blob HTML** — no son PDF/docx reales.
  Ambos. Véase skill `pdf-official` para un PDF real si se quiere corregir.
- **Plazos: festivos no implementados** (RF-PLAZO-5): Semana Santa,
  autonómicos, locales. Ambos.
- **CU-07 alta autoservicio:** `service_role` en endpoint público, sin
  captcha, `email_confirm:true` sin verificar, password en response, sin pago.
  Ambos — flag de hardening, no de paridad.
- **Email degrada** sin `RESEND_API_KEY`/`EMAIL_FROM` en SSM. Ambos.
- **`join_demo_organization` RPC** no resuelve vía PostgREST (schema cache) —
  los datos demo sí están sembrados, así que no afecta al usuario final.

### Cruft de Lovable descartado (no user-facing, no gap)

brokered preview auth, `lovable-error-reporting`, `cron-auth`, primitivos
shadcn no usados.

## Conclusión

`apps/bff-web` reproduce fielmente el prototipo de Lovable. La migración
**no introdujo regresiones funcionales**: 27/28 specs PASS y el único
bloqueado lo está por un **gap de provisioning de infra** (bucket Storage
ausente), no por código. Las limitaciones restantes (CU-02 sin submit,
exports no reales, festivos, CU-07, email) son **heredadas de Lovable** y
presentes en ambos — paridad neutra.

**Para alcanzar paridad funcional completa** basta con:
1. Crear el bucket `sanction-documents` en prod (GAP-1) → desbloquea CU-01.
2. (Opcional, mejora) añadir botón submit al alta manual → arregla CU-02.