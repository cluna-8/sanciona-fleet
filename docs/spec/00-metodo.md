# 00 — Método de desarrollo

Cómo se construye y se revisa Sanciona Fleet. Complementa a `README.md`
(spec-driven en una página) y a `SPEC.md §7.5` (estrategia de migración).

## 1. Spec-driven

La especificación va delante del código, no detrás:

```
inventario ──► SPEC.md ──► casos de uso ──► código ──► tests
 (qué había)   (qué debe    (cómo sé que    (cómo)    (lo demuestran)
               hacer)       está bien)
```

Reglas prácticas (detalladas en `README.md`):

1. Todo requisito tiene un identificador (`RF-PLAZO-3`, `RS-2`, `RF-ALTA-2`).
2. Todo commit que implementa un requisito lo cita en su mensaje, para que
   `git log --grep=RF-PLAZO` responda "¿qué se ha hecho de esto?".
3. La spec cambia antes que el código. Si al construir aparece algo no previsto,
   se sube la versión de SPEC y luego se construye. Un código que contradice la
   spec es un bug de uno de los dos.
4. Las decisiones se registran en `docs/adr/` y se enlazan desde SPEC. Una
   decisión no existe si no está en un ADR.

## 2. Decisiones de producto

Las decisiones de producto viven en SPEC con el formato
✅ **DECIDIDO (ADR n, D-k)**. Antes (v0.3) eran 🟡 "pendientes"; ADR 0004 las
resolvió el 19 sep 2026 aplicando los valores por defecto que la propia SPEC
recomendaba. Tres puertas humanas quedan bloqueantes para v1 pública (validación
jurídica, precios, DPA) y se siguen en `docs/compliance/README.md` — ninguna
bloquea seguir construyendo.

## 3. Flujo de ramas y worktrees

- **`main`** es la rama integra; todo lo que está en `main` pasa la verificación
  de CI (`verificar`: typecheck + lint + build + tests).
- El trabajo de feature se hace en **worktrees aislados** (`.claude/worktrees/`)
  sobre una rama `worktree-<tarea>`, no directamente sobre `main`. Esto evita
  mezclar WIP con la copia de trabajo del usuario y permite paralelizar.
- Cada cambio se abre como **PR** contra `main` con el nombre de la etapa o
  hallazgo (p. ej. `worktree-etapa3-bff-web`, `worktree-rs3-limpiar-migraciones`).
- Se mergear con **fast-forward** cuando sea posible; si no, merge commit con
  mensaje que explique el porqué. Nunca `force-push` a `main`.
- Los commits se firman con `Co-Authored-By: Claude Code <noreply@anthropic.com>`
  cuando los produce el agente.

## 4. Migración: strangler fig

No se reescribe el monolito de golpe; se extrae un servicio a la vez mientras el
resto sigue sirviéndose desde `apps/bff-web`. Orden (SPEC §7.5):

1. ✅ `deadlines-service` — extraído (lógica pura, mayor riesgo legal).
2. ✅ `packages/ai-provider` — extraído (desacopla del gateway de IA de Lovable).
3. ⬜ `identity-service` y `fleet-service` — más aisladas, menor acoplamiento.
4. ⬜ `sanctions-service` — el núcleo, al final (más dependencias entrantes).
5. ⬜ El resto (`extraction`, `analysis`, `drafts`, `documents`,
   `notifications`, `reporting`, `legal-catalog`, `billing`) por valor/riesgo.
6. `bff-web` se queda como front + orquestación: sus rutas dejan de llamar a
   `supabase.from(...)` y pasan a llamar a los servicios.

Cada servicio extraído publica sus tipos en `packages/contracts` y es dueño de
sus tablas (un esquema de Postgres por servicio en un único proyecto Supabase,
SPEC §7.3).

## 5. Puertas de calidad (CI)

El pipeline `.github/workflows/ci.yml` define las puertas que todo cambio a
`main` debe pasar:

1. **`verificar`** (PR y push a main): typecheck por paquete, typecheck de
   `bff-web`, `eslint`, `build` de bff-web y `bun test` (toda la suite). Si
   `bun test` falla, no se construye ni despliega nada — el motor de plazos
   tiene consecuencia legal directa (SPEC §7.4).
2. **`build-and-push`** (solo push a main): build y push de imágenes a ECR por
   OIDC.
3. **`deploy`** (solo push a main): SSM Run Command en la EC2.

La estrategia de pruebas (qué se testa a cada nivel) está en
`docs/spec/07-plan-de-pruebas.md`.

## 6. Reglas no negociables

- El motor de plazos es **determinista y sin IA**; sus reglas requieren
  validación de un abogado administrativista antes de v1 pública.
- Todo lo que genera un modelo (extracción, análisis, borradores) es un apoyo
  que **un humano revisa y valida**. Nunca una decisión automática.
- `multas-export/` es **solo lectura** (Lovable congelado el 18 sep 2026);
  `apps/bff-web` es la única fuente viva de frontend.