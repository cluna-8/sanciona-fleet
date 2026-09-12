# Trazabilidad y estado real

Qué está hecho, qué falta y dónde vive cada cosa. Es la respuesta corta a
"¿cómo va el proyecto?".

Actualizado: 12 de septiembre de 2026.

---

## 1. Resumen

| | Cantidad |
|---|---:|
| Requisitos funcionales en SPEC.md | 34 |
| De ellos, `[EXISTENTE]` (funcionan y se conservan) | 15 |
| De ellos, `[NUEVO]` (pendientes de construir) | 19 |
| Requisitos sin RF asignado (capacidades añadidas en Lovable) | 4 |
| Decisiones de producto pendientes | 10 |
| Servicios extraídos del monolito | 1 de 12 |
| Tests automáticos | 47 |
| Cobertura de tests | solo `deadlines-service` y `ai-provider` |

---

## 2. Qué está construido de verdad

| Pieza | Dónde | Tests | Estado |
|---|---|:---:|---|
| Motor de plazos | `services/deadlines-service` | 16 ✅ | Funcional. ⚠️ Pendiente validación jurídica y festivos (RF-PLAZO-5) |
| Interfaz de IA | `packages/ai-provider` | 31 ✅ | Funcional. 4 proveedores intercambiables |
| Contratos compartidos | `packages/contracts` | — | Tipos de plazos y de IA |
| CI | `.github/workflows/ci.yml` | — | Typecheck por paquete + tests |
| Comparador con Lovable | `scripts/comparar-lovable.sh` | — | Detecta divergencia del prototipo |

Todo lo demás sigue dentro del monolito heredado (`multas-export/`), que
funciona pero no es la base de despliegue.

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
| ⚠️ **Bloqueante v1** | — | Validación jurídica del motor de plazos |
| ⚠️ **Crítico** | RF-ALTA-2 | El alta manual no tiene botón de envío |
| ⚠️ **Seguridad** | RS-3 | Migración con contraseña en claro |
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
| **Sin servicio asignado** | **Facturación y cobro** | ⚠️ No existe en el mapa |

---

## 5. Cómo mantener esto vivo

1. **Cita el RF en el commit.** `git log --grep=RF-PLAZO` debe responder qué se
   hizo de ese requisito.
2. **Un RF no está hecho hasta que tiene test.** "Implementado sin test" es una
   categoría, no un final.
3. **Si aparece algo que la spec no previó, se actualiza la spec primero.** Lo
   contrario es lo que pasó con el alta en autoservicio: código en producción,
   cuatro capacidades sin requisito y decisiones de negocio tomadas por un
   modelo.
4. **Cada sincronización con Lovable se registra** en `CAMBIOS-LOVABLE.md`.
