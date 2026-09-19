# Trazabilidad y estado real

Qué está hecho, qué falta y dónde vive cada cosa. Es la respuesta corta a
"¿cómo va el proyecto?".

Actualizado: 19 de septiembre de 2026.

---

## 1. Resumen

| | Cantidad |
|---|---:|
| Requisitos funcionales en SPEC.md | 34 |
| De ellos, `[EXISTENTE]` (funcionan y se conservan) | 15 |
| De ellos, `[NUEVO]` (pendientes de construir) | 19 |
| Requisitos sin RF asignado (capacidades añadidas en Lovable) | 4 |
| Decisiones de producto | 0 pendientes (11 resueltas en ADR 0004; 3 puertas humanas restantes) |
| Servicios extraídos del monolito (desplegados por separado) | 1 de 13 (`deadlines-service`); `packages/ai-provider` extraído como librería |
| Features modularizadas dentro de `apps/bff-web` (preparación para extraer) | 10 de 10 |
| Tests automáticos | 50 |
| Cobertura de tests | solo `deadlines-service` y `ai-provider`; `bff-web` sin tests en `main` (ver `07-plan-de-pruebas.md`) |
| Infra AWS | Aplicada (terraform apply 18 sep): EIP 63.181.51.42, EC2, ECR, rol OIDC, SSM. Ver ADR 0003 |
| Repositorio | [github.com/cluna-8/sanciona-fleet](https://github.com/cluna-8/sanciona-fleet) (privado) |

---

## 2. Qué está construido de verdad

| Pieza | Dónde | Tests | Estado |
|---|---|:---:|---|
| Motor de plazos | `services/deadlines-service` | 16 ✅ | Funcional. ⚠️ Pendiente validación jurídica y festivos (RF-PLAZO-5) |
| Interfaz de IA | `packages/ai-provider` | 34 ✅ | Funcional. Proveedor `openrouter` por defecto (ADR 0001/0003) |
| Contratos compartidos | `packages/contracts` | — | Tipos de plazos, de IA y de dominio (`domain.ts`) |
| CI | `.github/workflows/ci.yml` | — | verificar (typecheck+lint+build+tests) → build-and-push ECR → deploy SSM (ADR 0003). Deploy bloqueado hasta rellenar SSM/secrets de GitHub |
| Infra AWS | `infra/aws/`, `infra/cloudflare/` | — | Terraform aplicado 18 sep (ADR 0003). EIP 63.181.51.42 |
| Comparador con Lovable | `scripts/comparar-lovable.sh` | — | Detecta divergencia del prototipo (congelado 18 sep) |
| Frontend (`apps/bff-web`) | `apps/bff-web/src/features/*` | — | Sin acoplamiento a Lovable; 10 features modularizadas, capa de datos separada de la UI. Verificado con `docker compose up` real (alta de cuenta, login, panel de control). Detalle completo en `docs/spec/06-arquitectura-bff-web.md` y ADR 0002 |

`multas-export/` queda congelado como espejo de solo lectura del export de
Lovable — el desarrollo real vive en `apps/bff-web/`.

---

## 3. Requisitos por estado

### Cubiertos con test automático

| RF | Qué garantiza | Test |
|---|---|---|
| RF-PLAZO-1 | Nunca se calcula desde la fecha de emisión | `plazos.test.ts` |
| RF-PLAZO-2 | Documento vs. cálculo, con discrepancia explícita | `plazos.test.ts` |
| RF-ANALISIS-2 | Solo fuentes verificadas; fallbacks conservadores | `proveedor.test.ts`, `normalizar.test.ts` |
| RF-ANALISIS-4 | Proveedor de IA intercambiable | `proveedor.test.ts` |

### Implementados sin test

RF-ALTA-1, RF-ALTA-3, RF-ALTA-4, RF-ALTA-5, RF-FLOTA-1, RF-FLOTA-3,
RF-ANALISIS-1, RF-BORRADOR-1, RF-BORRADOR-2, RF-INF-1, RF-PREV-1, RF-AUTH-1,
RF-AUTH-2, RS-1, RS-5.

Funcionan en el monolito. Nada los verifica, y al extraerlos a servicios habrá
que escribir los tests que hoy no existen.

### Pendientes, ordenados por urgencia

| Prioridad | RF | Qué falta |
|---|---|---|
| ⚠️ **Bloqueante v1** | RF-PLAZO-5 | Festivos autonómicos, locales y móviles |
| ⚠️ **Bloqueante v1** | — | Validación jurídica del motor de plazos (puerta humana, ADR 0004 D-3) |
| ⚠️ **Crítico** | RF-ALTA-2 | El alta manual no tiene botón de envío |
| ✅ **Resuelto** | RS-3 | Migraciones limpias de credenciales (merge `worktree-rs3-limpiar-migraciones`, 19 sep) |
| ⚠️ **Seguridad** | RS-2 | `/sanciones/$id` sin filtro por organización |
| Alta | RF-PLAZO-3 | Unificar el cálculo de "plazo relevante" (triplicado) |
| Alta | RF-PLAZO-4 | Consumir `sanction_deadlines` en vez de campos planos |
| Alta | RF-FLOTA-2 | No existe borrado en la interfaz |
| Alta | RF-PERF-1, RF-PERF-2 | Sin paginación; fichas cargan la lista entera |
| Media | RF-BORRADOR-3 | "Exportar a PDF" no genera un PDF |
| Media | RF-AUTH-3 | Las invitaciones no envían correo |
| Media | RF-ANALISIS-3 | `recommended_action` se calcula y no se muestra |
| Media | RF-DOC-1 | `/documentos` no permite subir |
| Baja (v2) | RF-BORRADOR-4, 5, 6 | `.docx` real, diff de versiones, restaurar-y-guardar |
| Baja (v2) | RF-INF-2 | `sanction_outcomes` nunca se rellena |
| Baja (v2) | RF-DOC-2 | `document_access_logs` nunca se escribe |
| Baja (v2) | RF-PREV-2 | Agrupado por municipio depende del alta por IA |

### Capacidades sin requisito asignado

Añadidas en Lovable el 9–12 de septiembre, **sin pasar por la spec**:

| Capacidad | Estado | Problema |
|---|---|---|
| Alta de empresa en autoservicio | Implementada | ⚠️ Endpoint público con `service_role`, sin captcha ni límite |
| Planes y tarifas (49/99/199 €) | Implementada | ⚠️ Sin cobro: cualquiera elige el plan más caro gratis |
| Correo transaccional (Resend) | Implementada | Sin configurar. Proveedor nuevo, no evaluado para RGPD |
| Login por nombre de usuario | Implementada | Sin problemas detectados |

Ver `docs/legacy/CAMBIOS-LOVABLE.md`.

---

## 4. Del requisito al servicio

Adónde irá cada requisito cuando se complete la migración (SPEC.md §7.1):

| Servicio | Requisitos | Estado |
|---|---|---|
| `deadlines-service` | RF-PLAZO-1..5 | ✅ Extraído |
| `packages/ai-provider` | RF-ANALISIS-4 | ✅ Extraído |
| `identity-service` | RF-AUTH-1..4, RS-1 | Pendiente |
| `fleet-service` | RF-FLOTA-1..3 | Pendiente |
| `sanctions-service` | RF-ALTA-2..5, máquina de estados, RS-2 | Pendiente |
| `extraction-service` | RF-ALTA-1 | Pendiente |
| `analysis-service` | RF-ANALISIS-1..3 | Pendiente |
| `drafts-service` | RF-BORRADOR-1..6 | Pendiente |
| `documents-service` | RF-DOC-1, RF-DOC-2 | Pendiente |
| `notifications-service` | RF-AUTH-3, correo transaccional | Pendiente |
| `reporting-service` | RF-INF-1, RF-INF-2, RF-PREV-1, RF-PREV-2 | Pendiente |
| `legal-catalog-service` | Mantenimiento de `legal_sources` | Pendiente |
| `billing-service` | RF-ALTA-EMPRESA-5 (planes, cobros, pasarela) | Pendiente (ADR 0004, D-5) |

---

## 5. Refactor del frontend — estado de las 4 etapas

Ver `docs/refactor/PLAN-REFACTOR-FRONTEND.md` (el plan) y
`docs/spec/06-arquitectura-bff-web.md` (el resultado, con detalle técnico).

| Etapa | Qué era | Estado |
|---|---|---|
| 1. Cimientos | Vite explícito sin Lovable, poda de dependencias, CI | ✅ Completa |
| 2. Capa de datos por feature | Sacar `supabase.from(...)` de rutas/componentes a `features/*/api` | ✅ Completa — 0 coincidencias de `supabase` en `src/routes` o `src/components`, regla de ESLint que lo bloquea a futuro |
| 3. Descomposición de componentes | Dividir los 8 archivos de 300-760 líneas | 🟡 Parcial — en `main` solo el "arranque"; la Etapa 3 completa (3.1–3.8 + cierre) está en `worktree-etapa3-bff-web` (PR #1, draft), pendiente de rebasear sobre `main`. Los archivos de mayor riesgo (`expediente.functions.ts`, `alta-documento.tsx`) se dejaron a propósito (ver ADR 0002) |
| 4. Verificación end-to-end | Docker local + prueba real | ✅ Completa — `docker compose up` con ambos servicios, alta de cuenta y login reales verificados |

**Antes de continuar la Etapa 3**: hace falta una base de regresión visual
(Playwright) contra un proyecto de Supabase de test, no el de producción.
Sin eso, dividir `expediente.functions.ts` (lógica de plazos y IA, con
consecuencia legal directa) es el riesgo que el plan señala en §1.6 — no un
atajo aceptable. La estrategia de pruebas que cubre este hueco está en
`docs/spec/07-plan-de-pruebas.md`.

## 6. Cómo mantener esto vivo

1. **Cita el RF en el commit.** `git log --grep=RF-PLAZO` debe responder qué se
   hizo de ese requisito.
2. **Un RF no está hecho hasta que tiene test.** "Implementado sin test" es una
   categoría, no un final.
3. **Si aparece algo que la spec no previó, se actualiza la spec primero.** Lo
   contrario es lo que pasó con el alta en autoservicio: código en producción,
   cuatro capacidades sin requisito y decisiones de negocio tomadas por un
   modelo.
4. **Lovable congelado** desde el 18 sep 2026: `apps/bff-web` es la única fuente
   viva; `multas-export/` es solo lectura. No se portan más cambios desde
   Lovable. `CAMBIOS-LOVABLE.md` queda como historial cerrado.
