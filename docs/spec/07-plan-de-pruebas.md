# 07 — Plan de pruebas

Qué se prueba, cómo y qué falta por probar. Es la estrategia para garantizar que
Sanciona Fleet funciona antes de abrirlo a clientes reales, y el criterio que
decide si una pieza "está hecha" (`docs/spec/05-trazabilidad.md` §6: *un RF no
está hecho hasta que tiene test*).

Actualizado: 19 de septiembre de 2026.

---

## 1. Estado actual

| Nivel | Qué cubre | Dónde | Cantidad |
|---|---|:--:|---:|
| **Unitario** | Motor de plazos (lógica pura, sin IA) | `services/deadlines-service/test/plazos.test.ts` | 16 |
| **Unitario** | Interfaz de IA: JSON, normalización, proveedores | `packages/ai-provider/test/*.test.ts` | 34 |
| **Unitario** | Validación de extracción (CIF, tipo, comparación de empresa) | `apps/bff-web/src/lib/validacion-extraccion.test.ts` | 6 |
| **Integración** | bff-web → deadlines-service (contrato de plazos) | `apps/bff-web/e2e/expediente.spec.ts` (CU-03, en vivo) | 1 |
| **E2E** | Flujos de usuario en prod (auth, rutas, flota, CU-02/03/04/05/06, superadmin, secundarias) | `apps/bff-web/e2e/*.spec.ts` | 28 |

**Total: 56 tests unitarios + 28 E2E = 84 tests.** `bun test` ejecuta los
unitarios desde la raíz del monorepo; `bash scripts/run-e2e.sh` ejecuta los
E2E contra prod (inyecta secretos SSM).

Lo que no se prueba hoy: el resto de la lógica de `apps/bff-web` (alta, flota,
borradores, documentos, informes, avisos, análisis, plazos UI), cualquier
flujo de extremo a extremo, y la integración con Supabase/IA real.

---

## 2. Estrategia por niveles

### 2.1 Unitarios — "rápido, determinista, sin red"

Regla: toda lógica de dominio pura (sin Supabase, sin red) vive en un módulo
importable y se testa con `bun test` sin levantar servicios. Es lo que hoy
cubren `deadlines-service`, `ai-provider` y `validacion-extraccion`.

Prioridad inmediata — extraer y testear la lógica hoy mezclada con la UI en
`apps/bff-web`:

1. **`plazos.ts` y el cálculo de "plazo relevante"** (RF-PLAZO-3). Hoy triplicado
   en `dashboard.tsx`, `sanciones.index.tsx` e inline en `sanciones.$id.tsx`.
   Extraer a una función pura y testearla con los mismos casos del motor.
2. **`compararEmpresa` / `validarAntesDeCrear`** (RF-ALTA-3/4): ampliar el test
   actual de `validacion-extraccion.test.ts` a los 7 campos obligatorios y a la
   coherencia de importes/fechas.
3. **`deducirTipoInfraccion` + `CATEGORIA_POR_TIPO`** (RF-ALTA-1, ADR 0004 D-7):
   testear que el prompt ajustado solo devuelve valores del catálogo o `"Otra"`.
4. **`planPorId`** y la lógica de límites por plan (ADR 0004 D-4/D-5): cuando se
   extraiga `billing-service`.

### 2.2 Integración — "contratos entre servicios"

Cada servicio extraído publica tipos en `packages/contracts`. Un test de
integración verifica que el contrato que un servicio espera es el que el otro
cumple. Hoy no hay ninguno; el primero debe nacer con `identity-service`:

- `bff-web → deadlines-service`: dado un expediente con `notification_date` y
  régimen, el cliente (`apps/bff-web/src/lib/deadlines-client.server.ts`) llama
  al servicio y recibe los plazos esperados. Se puede testear contra el Worker
  local (`bun run dev` en `services/deadlines-service`, puerto 8787) o contra
  el servidor Bun HTTP del Dockerfile.

### 2.3 E2E — "flujos de usuario de principio a fin"

El hueco más grande y el más necesario antes de v1. `docs/spec/05-trazabilidad.md`
señala que dividir `expediente.functions.ts` (lógica de plazos y IA, con
consecuencia legal) sin una base de regresión visual es el riesgo del plan de
refactor (§1.6). La cobertura E2E es la puerta.

- **Framework:** Playwright. Un único proyecto de Supabase de **test**
  (no el de producción), con las migraciones aplicadas y datos sembrados.
- **Alcance mínimo (bloqueante para seguir la Etapa 3 del refactor):**
  - CU-01 alta de expediente desde documento (subida → extracción → revisión →
    creación).
  - CU-03 cálculo de plazos (verifica el flujo `bff-web → deadlines-service`).
  - CU-06 aislamiento entre empresas (RS-1/RS-2: dos tenants no se ven).
- **Casos de uso completos:** `docs/spec/03-casos-uso.md` (CU-01..CU-07) define
  los escenarios en Gherkin; cada uno es la base de un spec de Playwright.

> La IA real (OpenRouter) no entra en E2E por defecto: es no determinista y
> cuesta. Se mockea el proveedor en E2E; la integración real con OpenRouter se
> prueba aparte (§3).

**Estado (2026-09-20):** suite E2E Playwright landada en `apps/bff-web/e2e/`
(11 specs) + `scripts/run-e2e.sh` (inyecta secretos SSM). Corrida contra **prod
en vivo** `https://sancionafleet.fexia.es`: **27 PASS / 0 FAIL / 1 BLOCKED**.
CU-03 ✅, CU-06 ✅; CU-04 (análisis IA real, OpenRouter) ✅; CU-05 (borrador
versionado) ✅; CU-02 documenta bug heredado (sin botón submit, también en
Lovable). **CU-01 bloqueado por GAP de infra** (bucket Storage
`sanction-documents` ausente en prod — ver `docs/spec/08-paridad-lovable.md`
GAP-1), no por código. Detalle y matriz de paridad en
`docs/spec/08-paridad-lovable.md`.

---

## 3. Pruebas que requieren recursos externos (no en CI por defecto)

| Qué | Cómo | Cuándo |
|---|---|---|
| **Extracción con PDF real contra OpenRouter** | Script que envía un PDF de prueba a `IA_MODELO_EXTRACCION` y verifica los campos extraídos. Riesgo: slugs de modelo distintos a Lovable y bloque `file` multimodal puede rechazarse (ADR 0003). | Antes de abrir a clientes. Puerta humana. |
| **Cálculo de plazos con festivos reales** | Casos con festivos autonómicos/locales/móviles (RF-PLAZO-5) una vez elegida la fuente de festivos. | Bloqueante v1. |
| **Migraciones contra Supabase de prod** | `bun run db:migrar:dry` luego `bun run db:migrar` contra el pooler (región EU). | Antes del primer deploy. |
| **Deploy automático (CI → EC2)** | Push a `main` dispara `build-and-push` → `deploy`. Requiere SSM relleno y secrets de GitHub. | Tras rellenar secretos. |

---

## 4. Puertas de CI (`.github/workflows/ci.yml`)

Todo cambio a `main` pasa el job `verificar` antes de anything:

1. Typecheck por paquete (`packages/*`, `services/*` con `tsconfig.json`).
2. Typecheck de `apps/bff-web` (`tsc --noEmit`).
3. `eslint` en `apps/bff-web`.
4. `build` de `apps/bff-web` (Nitro node-server, con build-args VITE_* placeholder).
5. `bun test` (toda la suite). **Si falla, no se construye ni despliega nada**
   — el motor de plazos tiene consecuencia legal directa (SPEC §7.4).

`concurrency` cancela runs obsoletos por rama.

### Réplica local del job `verificar`

Para reproducir la puerta de CI antes de empujar:

```sh
export PATH="$HOME/.bun/bin:$PATH"
# 1. tests
bun test
# 2. typecheck por paquete
for d in packages/* services/*; do
  [ -f "$d/tsconfig.json" ] && (cd "$d" && bunx tsc --noEmit) || true
done
# 3. typecheck + lint + build de bff-web
cd apps/bff-web
bun run typecheck
bun run lint
bun run build
```

Si los cinco pasos pasan en local, el job `verificar` de CI pasará en el push.

---

## 5. Cobertura objetivo para v1

Antes del primer cliente real, el plan exige:

- ✅ Motor de plazos unitario (hecho, 16 tests) + validación jurídica (puerta
  humana).
- ⬜ Extracción/validación unitaria ampliada (RF-ALTA-3/4, RF-PLAZO-3).
- ⬜ E2E Playwright de CU-01, CU-03, CU-06 contra Supabase de test.
  - ✅ **Hecho (2026-09-20):** suite landada, CU-03 y CU-06 PASS en prod.
    CU-01 bloqueado por bucket Storage ausente (GAP-1 infra, ver
    `08-paridad-lovable.md`). Adicionalmente CU-04 (IA real) y CU-05 PASS.
- ⬜ Prueba de extracción con PDF real contra OpenRouter.
  - ✅ **Hecho (2026-09-20):** CU-04 análisis IA real contra OpenRouter PASS
    en prod (semáforo + confianza). La extracción de CU-01 queda pendiente
    del bucket.
- ⬜ Integración `bff-web → deadlines-service` (contrato).
  - ✅ **Hecho (2026-09-20):** CU-03 recalcular plazos PASS en prod (3 plazos
    con tipo y fecha vía deadlines-service).

Lo que queda fuera de v1 (backlog v2): E2E de flujos de borradores/docx/diff
(RF-BORRADOR-4/5/6), analítica de resultados (RF-INF-2).