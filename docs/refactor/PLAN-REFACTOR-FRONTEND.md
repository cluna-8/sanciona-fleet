# Plan de refactorización del frontend (prototipo Lovable → producción)

- **Fecha:** 12 de septiembre de 2026
- **Base analizada:** `multas-export/` en `30ee89b` (export de Lovable del 12 sep, 151 archivos, 16.427 líneas en `src/`)
- **Perfil:** arquitectura + frontend senior. Este documento **no cambia código**: es el plan previo.
- **Referencias:** `SPEC.md` §7 (microservicios, strangler fig), `docs/legacy/INVENTARIO-AS-IS.md`, `docs/legacy/CAMBIOS-LOVABLE.md`, ADR 0001

---

## 0. Resumen ejecutivo

El prototipo **no tiene mock data**: todas las pantallas leen y escriben contra
Supabase real. Eso es una buena noticia. La deuda está en otro sitio:

| Deuda | Medida | Riesgo |
|---|---|---|
| Acceso a datos disperso | `supabase.from(...)` en **19 archivos**, 8 de ellos rutas y componentes de UI | Alto: bloquea el strangler fig de §7.5 (paso 5) |
| Tipado esquivado | **50 `as never`** + **11 `as unknown as`**; tipos de dominio escritos a mano en `use-datos.ts` en vez de derivarlos de `types.ts` (1.436 líneas generadas) | Alto: un cambio de esquema no da error de compilación |
| Componentes sobrecargados | 8 archivos entre 300 y 760 líneas que mezclan consulta, mutación, reglas y presentación | Medio: cada cambio de UI toca lógica de negocio |
| Dependencias superfluas | **34 de 46** componentes shadcn nunca se importan; 9 paquetes npm solo los usan ellos; `date-fns` no se usa en ningún sitio | Bajo en runtime, medio en mantenimiento y auditoría de supply chain |
| Acoplamiento a Lovable | El build depende de `@lovable.dev/vite-tanstack-config`; 4 archivos de telemetría/auth de preview solo tienen sentido dentro de Lovable | Alto: el proyecto no compila fuera de ese paquete |
| Sin red de seguridad | 0 tests, sin CI, `.env` fuera de `.gitignore` | Alto: no hay forma de demostrar que un refactor no rompe la UI |

**Decisión estructural que este plan asume** (ver §4): el refactor se hace en
`apps/bff-web/`, que nace como copia de `multas-export/`. El espejo de Lovable
se congela como referencia. Refactorizar el espejo es tirar trabajo: cada
`comparar-lovable.sh` lo pisaría.

---

## 1. Informe de deuda técnica

### 1.1 Componentes y rutas sobrecargados

Criterio: archivo > 300 líneas **o** que combine consultas, mutaciones y
presentación en la misma función.

| Archivo | Líneas | Qué mezcla | Diagnóstico |
|---|---:|---|---|
| `lib/expediente.functions.ts` | 760 | 5 server functions, **34** llamadas `supabase.from`, normalización de campos, creación de avisos, cálculo de plazos | Es un "servicio de todo". Contiene en un solo archivo lo que en §7.1 son cuatro servicios distintos (extraction, sanctions, analysis, drafts) |
| `components/alta-documento.tsx` | 589 | **13 `useState`**, 2 mutaciones, subida a Storage, normalización de campos, wizard de 4 pasos, validación de CIF | Máquina de estados implícita repartida en 13 variables. Cualquier paso nuevo obliga a tocar todas |
| `routes/index.tsx` | 542 | Login + alta en autoservicio en dos pestañas, 2 `useEffect`, muestra la contraseña generada | Pantalla pública con la lógica de alta de `CAMBIOS-LOVABLE.md` (hallazgos 1–4) incrustada en la vista |
| `routes/_authenticated/sanciones.$id.tsx` | 429 | **4 `useQuery` + 2 `useMutation`** inline con 8 `supabase.from`, tres tipos locales (`Documento`, `Actuacion`, `Comentario`), invalidación manual de 3 claves | La ficha del expediente conoce el esquema de 5 tablas. Es el archivo que más se va a tocar y el peor preparado |
| `components/panel-analisis.tsx` | 411 | 4 mutaciones, escritura directa en `sanction_analyses` desde el componente, renderizado de 6 bloques | Un componente de presentación que además valida análisis (RF-ANALISIS) |
| `routes/_authenticated/vehiculos.index.tsx` | 354 | Listado + formulario de alta + edición + borrado | Tres pantallas en una. Igual en `conductores.index.tsx` (308) |
| `routes/_authenticated/sanciones.nueva.tsx` | 342 | Alta manual con 4 `supabase.from` | Duplica normalización con `alta-documento.tsx` |
| `routes/_authenticated/usuarios.tsx` | 333 | 6 `supabase.from`, gestión de miembros, invitaciones y roles | Lógica de `identity-service` (§7.1) dentro de una vista |
| `routes/_authenticated/borradores.$id.tsx` | 319 | 5 `supabase.from`, 2 `useEffect` de sincronización editor↔query | Estado derivado copiado a estado local: fuente clásica de bugs de "se me borró lo que escribí" |

Patrones repetidos que confirman la falta de capa intermedia:

- **Filtros "TODOS"**: `sanciones.index.tsx` y `documentos.tsx` reimplementan el
  mismo patrón (`const TODOS = "__todos__"` + N `useState` + filtro en memoria).
  `sanciones.index.tsx` tiene 6 filtros en 6 `useState` y filtra en cliente el
  listado completo (contradice RF-PERF-1/2, paginación).
- **Listado + alta + edición en el mismo archivo**: vehículos, conductores,
  usuarios. Tres veces el mismo esqueleto sin abstracción.
- **Card de shadcn nunca se usa**: hay `components/ui/card.tsx` pero dashboard,
  informes y prevención maquetan las tarjetas con `div` a mano.
- **Esqueletos de carga**: `Skeleton` se importa 15 veces con layouts ad hoc,
  sin un `<EstadoCarga>` reutilizable.

### 1.2 Datos: dónde vive cada consulta

Distribución de `supabase.from(...)` (57 en total, excluyendo el server):

```
lib/         46   (expediente.functions 34, superadmin 6, alta 5, login 1)
routes/      31   (sanciones.$id 8, usuarios 6, borradores.$id 5, sanciones.nueva 4, …)
hooks/       12   (use-expediente 7, use-datos 3, use-org 2)
components/   3   (alta-documento 2, panel-analisis 1)
```

Consecuencias concretas:

1. **§7.5 paso 5** ("las rutas dejan de llamar a `supabase.from` y pasan a
   llamar a los servicios") hoy exige tocar 8 rutas y 2 componentes de UI. Con
   una capa `features/*/api` se toca un adaptador por feature.
2. **20 `queryKey` distintas como literales de string** (`["sancion", id]`,
   `["sancion-actions", id]`…) repartidas por rutas y componentes, con
   invalidación manual. Un typo en una invalidación no falla: simplemente la
   pantalla se queda desactualizada. Ya ocurre el precedente: `sanciones.$id`
   invalida 3 claves a mano tras cambiar el estado.
3. **Tipos duplicados**: `Vehiculo`, `Conductor`, `Sancion`, `Organizacion` se
   escriben a mano en `use-datos.ts` y `use-org.ts` mientras
   `integrations/supabase/types.ts` ya los genera. Los `as never` (50) son la
   consecuencia: el tipo manual no encaja con el generado y se fuerza.

### 1.3 Mock data y valores hardcodeados

**No hay mock data.** No existe ningún array de datos ficticios ni fixture en
`src/`. Lo que sí hay son **valores de negocio incrustados en código** que
deberían ser configuración o decisión de producto:

| Dónde | Qué | Debería ser |
|---|---|---|
| `lib/planes.ts` | Precios 49/99/199 € y límites por plan | Decisión de negocio (SPEC §4, pendiente); como mínimo, constantes en un solo módulo de dominio con test |
| `lib/email.server.ts` | `PUBLIC_SITE_URL` por defecto `https://sanciona.lovable.app`; plantilla apunta a `/auth`, que ya no existe | Variable de entorno obligatoria sin valor por defecto |
| `lib/fleet.ts` | `ESTADOS_SANCION`, `ESTADOS_ABIERTOS`, roles | Correcto que sean constantes, pero deben venir de `@sanciona/contracts` para que el frontend y los servicios compartan la máquina de estados (§4.2) |
| `routes/_authenticated/tutorial.tsx` + `assets/tutorial/*.jpg` | 6 capturas del prototipo | Se quedarán obsoletas con el primer cambio de UI. Retirar o regenerar en Etapa 4 |
| `components/alta-documento.tsx` | Lista `EXTENSIONES`, tamaño máximo, `TIPOS_DOCUMENTO` | Contrato de `extraction-service` |

### 1.4 Dependencias superfluas

**Componentes shadcn instalados y nunca importados fuera de `ui/` (34 de 46):**

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb,
calendar, card, carousel, chart, checkbox, collapsible, command, context-menu,
drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu,
pagination, popover, progress, radio-group, resizable, scroll-area, sidebar,
slider, switch, table, toggle-group.

Solo se usan 13: button, skeleton, label, input, select, textarea, dialog,
tooltip, toggle, tabs, sonner, sheet, separator.

**Paquetes npm cuyo único consumidor es un componente `ui/` sin uso:**

| Paquete | Lo usa | Acción |
|---|---|---|
| `embla-carousel-react` | carousel | Retirar |
| `input-otp` | input-otp | Retirar |
| `react-resizable-panels` | resizable | Retirar |
| `vaul` | drawer | Retirar |
| `cmdk` | command | Retirar |
| `recharts` | chart | Retirar **ahora**; reintroducir en Etapa 4 si informes lo necesita (hoy informes maqueta barras con `div`) |
| `react-day-picker` | calendar | Retirar; el calendario de vencimientos no lo usa |
| `react-hook-form` + `@hookform/resolvers` | form | **Conservar**: el plan lo adopta en Etapa 3 para los formularios de flota |
| `date-fns` | nadie | Retirar (0 importaciones) |
| 15 paquetes `@radix-ui/react-*` | solo los componentes anteriores | Retirar con ellos |

**Acoplamiento a Lovable (no es "superfluo", es bloqueante):**

| Archivo | Papel | Acción |
|---|---|---|
| `@lovable.dev/vite-tanstack-config` | Toda la config de Vite/Nitro/Tailwind/alias | Sustituir por `vite.config.ts` explícito (Etapa 1) |
| `lib/lovable-error-reporting.ts`, `lib/error-capture.ts` | Telemetría hacia el editor de Lovable | Retirar; sustituir por captura propia (Sentry o Workers Logs) |
| `integrations/supabase/previewAuthStorage.ts` | Storage de sesión para el iframe de preview | Retirar |
| `integrations/supabase/cron-auth.ts` | Auth de cron de Lovable Cloud | Retirar; los crons pasan a Cloudflare Cron Triggers |
| `AGENTS.md` | Aviso de Lovable sobre historia git | Solo aplica al espejo; no copiar a `apps/bff-web` |

### 1.5 Ausencias

- **0 tests** en `multas-export/`. Los 47 que existen en el repo están en
  `deadlines-service` y `ai-provider`.
- **Sin CI.** `tsc --noEmit` y `eslint` no corren en ningún sitio.
- **`.env` con claves públicas sin `.gitignore`** (inventario §2).
- **`tsconfig` estricto pero neutralizado**: `strict`, `noUncheckedIndexedAccess`
  y `exactOptionalPropertyTypes` están activos, pero los 61 casts los vacían.

### 1.6 Priorización

| Prioridad | Deuda | Por qué primero |
|:--:|---|---|
| 1 | Acoplamiento a Lovable + `.env` + CI | Sin esto nada se puede desplegar ni verificar fuera de Lovable |
| 2 | Capa de datos por feature + query keys + tipos | Habilita §7.5 paso 5 y elimina la mayoría de casts |
| 3 | Descomposición de los 8 archivos grandes | Solo tiene sentido con la capa de datos ya extraída; si no, se mueve el problema de sitio |
| 4 | Poda de dependencias y `ui/` | Barato y seguro; se hace en Etapa 1 porque no toca UI visible |
| 5 | Valores hardcodeados | Depende de decisiones de negocio pendientes en SPEC §4 |

---

## 2. Estructura de carpetas objetivo: modular por features

### 2.1 Principio

**Una feature = un servicio de SPEC §7.1.** No es una convención estética: es
lo que hace que el strangler fig sea mecánico. Cuando `fleet-service` exista,
se cambia `features/flota/api/client.ts` de "habla con Supabase" a "habla con
el Worker". Ninguna ruta ni componente se entera.

```
apps/bff-web/
├── src/
│   ├── app/                        Arranque: providers, QueryClient, tema, router
│   │   ├── providers.tsx
│   │   ├── query-client.ts
│   │   └── router.tsx
│   │
│   ├── routes/                     Solo enrutado. Cada archivo: createFileRoute + <PaginaX/>
│   │   ├── __root.tsx              Nunca importa supabase ni @tanstack/react-query
│   │   ├── index.tsx
│   │   └── _authenticated/
│   │       ├── route.tsx           guard de sesión (llama a features/auth)
│   │       ├── dashboard.tsx       → <PaginaDashboard/>
│   │       ├── sanciones.$id.tsx   → <PaginaFichaExpediente id/>
│   │       └── …
│   │
│   ├── features/                   Mapa 1:1 con SPEC §7.1
│   │   ├── auth/                   identity-service: sesión, login, reset
│   │   ├── organizacion/           identity-service: empresa, miembros, invitaciones, roles
│   │   ├── alta/                   identity-service (+ facturación, sin servicio asignado aún)
│   │   ├── flota/                  fleet-service: vehículos y conductores
│   │   ├── expedientes/            sanctions-service: listado, ficha, alta manual, estados, comentarios, actuaciones
│   │   ├── extraccion/             extraction-service: alta desde documento (wizard)
│   │   ├── plazos/                 deadlines-service (ya existe como Worker)
│   │   ├── analisis/               analysis-service: panel de análisis, revisión
│   │   ├── borradores/             drafts-service: editor, versiones, validación
│   │   ├── documentos/             documents-service: listado, descarga, subida
│   │   ├── avisos/                 notifications-service
│   │   ├── informes/               reporting-service: informes, prevención, calendario
│   │   └── superadmin/             identity-service (vista global)
│   │
│   │   Cada feature tiene la misma forma:
│   │   ├── api/
│   │   │   ├── keys.ts             Factory de queryKeys: expedientesKeys.detalle(id)
│   │   │   ├── client.ts           Único sitio que conoce supabase o el Worker. Devuelve tipos de @sanciona/contracts
│   │   │   ├── queries.ts          useExpediente(id), useExpedientes(filtros)
│   │   │   └── mutations.ts        useCambiarEstado(), con invalidación centralizada
│   │   ├── server/                 createServerFn de esta feature (lo que hoy está en lib/*.functions.ts)
│   │   ├── model/
│   │   │   ├── types.ts            Reexporta de @sanciona/contracts; tipos solo de vista
│   │   │   ├── schemas.ts          Zod para formularios
│   │   │   └── reglas.ts           Funciones puras (plazoRelevante, puedeTransicionar…) con test
│   │   ├── components/             Componentes de la feature
│   │   ├── pages/                  Composición de página: PaginaFichaExpediente.tsx
│   │   └── index.ts                API pública. Otra feature solo importa desde aquí
│   │
│   ├── shared/
│   │   ├── ui/                     shadcn podado (13 componentes + los que Etapa 3 adopte)
│   │   ├── components/             AppShell, Etiquetas, EstadoCarga, EstadoVacio, FiltroSelect, TablaDatos, TarjetaKpi
│   │   ├── hooks/                  use-mobile, use-debounce
│   │   └── lib/                    formato (importe, fecha), cn(), fechas
│   │
│   ├── integrations/
│   │   └── supabase/               client, client.server, types.ts generado. Solo lo importa features/*/api/client.ts
│   │
│   └── server.ts                   Entrada SSR propia (sin wrapper de Lovable)
│
├── e2e/                            Playwright: un smoke por ruta + visual baseline
├── vite.config.ts                  Explícito, sin @lovable.dev
├── wrangler.jsonc                  bff-web como Worker (§7.4)
└── package.json                    Solo lo que se importa
```

### 2.2 Reglas de dependencia (se hacen cumplir con ESLint `no-restricted-imports`)

| Desde | Puede importar | No puede importar |
|---|---|---|
| `routes/` | `features/*` (solo `index.ts`), `shared/` | `integrations/`, `@tanstack/react-query`, `supabase` |
| `features/X/components`, `pages` | `features/X/api`, `features/X/model`, `shared/`, `features/Y` (solo `index.ts`) | `integrations/`, `features/Y/api` |
| `features/X/api/client.ts` | `integrations/`, `@sanciona/contracts` | otras features |
| `shared/` | `shared/` | `features/`, `integrations/` |

La regla de oro: **`grep -r "supabase" src/routes src/features/*/components` devuelve 0**.

### 2.3 Correspondencia con el código actual

| Hoy | Mañana |
|---|---|
| `hooks/use-datos.ts` | `features/flota/api/*` + `features/expedientes/api/*` |
| `hooks/use-org.ts` | `features/auth/api/queries.ts` (`useSesion`) + `features/organizacion/api/*` |
| `hooks/use-expediente.ts` | `features/extraccion/api/*`, `features/plazos/api/*`, `features/analisis/api/*` |
| `lib/expediente.functions.ts` (760) | `features/extraccion/server/`, `features/expedientes/server/`, `features/analisis/server/`, `features/borradores/server/`, `features/plazos/server/` |
| `lib/plazos.ts` | Se elimina: ya vive en `services/deadlines-service`; el frontend usa `features/plazos/api/client.ts` |
| `lib/fleet.ts` (estados, roles, formato) | Estados y roles → `@sanciona/contracts`; formato → `shared/lib/formato.ts` |
| `lib/analisis.ts`, `lib/validacion-extraccion.ts` | `features/analisis/model/`, `features/extraccion/model/` |
| `components/alta-documento.tsx` | `features/extraccion/components/` (wizard descompuesto) |
| `components/panel-analisis.tsx` | `features/analisis/components/` |
| `components/app-shell.tsx`, `etiquetas.tsx` | `shared/components/` |

---

## 3. Plan en 4 etapas

Cada etapa termina con la UI **idéntica** a la del inicio. La forma de
demostrarlo es la suite de smoke + visual de Etapa 1: es la red que permite
las otras tres.

### Etapa 1 — Cimientos: compilar y verificar fuera de Lovable (sin tocar UI)

**Objetivo.** `apps/bff-web` existe, compila sin `@lovable.dev`, tiene CI y una
suite que fotografía las 20 pantallas.

| # | Tarea | Detalle |
|---|---|---|
| 1.1 | Crear `apps/bff-web` como copia de `multas-export/src` | El espejo queda intacto. Añadir nota en `docs/legacy/CAMBIOS-LOVABLE.md`: a partir de aquí, cada sync se **porta** a mano a `apps/bff-web`, no se copia |
| 1.2 | `vite.config.ts` explícito | tanstackStart, react, tailwindcss, tsconfigPaths, nitro target cloudflare. Comparar el bundle resultante con el del espejo (mismo tamaño ±5 %) |
| 1.3 | Retirar telemetría de Lovable | `lovable-error-reporting.ts`, `error-capture.ts`, `previewAuthStorage.ts`, `cron-auth.ts`. Sustituir por un `ErrorBoundary` propio y logging a consola hasta decidir proveedor |
| 1.4 | `.gitignore` con `.env`; `.env.example` | Cierra el hallazgo del inventario §2 |
| 1.5 | Podar `ui/` y `package.json` | Eliminar los 34 componentes y los 9 paquetes de §1.4. Verificar con `bunx tsc --noEmit` y `bun run build` |
| 1.6 | CI (GitHub Actions) | `tsc --noEmit`, `eslint`, `bun test`, `bun run build` en cada PR |
| 1.7 | Playwright: smoke + visual baseline | Un test por ruta que hace login con una cuenta de prueba, carga la página y guarda captura. Usa un proyecto Supabase de test con datos sembrados por script (`export-datos.sql` como base). **Sin esto, las Etapas 2–4 no tienen forma de afirmar "no rompí nada"** |
| 1.8 | Regenerar `types.ts` desde Supabase y fijarlo en CI | `supabase gen types` como paso de CI que falla si el archivo committeado difiere |

**Criterio de salida.** `bun run build` sin `@lovable.dev`; CI en verde; 20
capturas guardadas como baseline; `package.json` con ~25 dependencias menos.

**Riesgo.** Que `@lovable.dev/vite-tanstack-config` haga algo no documentado
(dedupe, inyección de env). Mitigación: diff del bundle y de las variables
`VITE_*` en runtime antes y después.

**RF/RS que cita.** RS-2, RS-3 (secretos, entorno), SPEC §7.4 (monorepo, Worker
independiente).

### Etapa 2 — Capa de datos por feature (la UI no cambia, cambia de dónde lee)

**Objetivo.** Ninguna ruta ni componente importa `supabase`. Cada feature
expone hooks tipados con `@sanciona/contracts`.

| # | Tarea | Detalle |
|---|---|---|
| 2.1 | Ampliar `@sanciona/contracts` | Añadir `Expediente`, `Vehiculo`, `Conductor`, `Organizacion`, `Miembro`, `Documento`, `Analisis`, `Borrador`, más `EstadoExpediente` y `Rol` como uniones literales. Derivarlos de `types.ts` generado (`Tables<"sanctions">`) para que no haya dos fuentes |
| 2.2 | Crear `features/*/api/keys.ts` | Factory por feature. Elimina las 20 claves literales. Invalidación por prefijo: `expedientesKeys.all` |
| 2.3 | Mover cada `supabase.from` de rutas y componentes a `features/*/api/client.ts` | Orden por acoplamiento creciente: `avisos` (1) → `documentos` (2) → `flota` (4) → `organizacion` (6 + 2) → `borradores` (5) → `expedientes` (8 + 4) → `alta` (5). Una PR por feature, con las capturas de Etapa 1 como verificación |
| 2.4 | `features/*/api/queries.ts` y `mutations.ts` | Mutaciones con `onSuccess` que invalida por prefijo. Las rutas pasan de 4 `useQuery` inline a `const { data } = useFichaExpediente(id)` |
| 2.5 | Eliminar los 61 casts | Con 2.1 y 2.3 deberían caer solos. Cada `as never` que sobreviva se documenta en el PR con el motivo |
| 2.6 | Regla ESLint `no-restricted-imports` de §2.2 | Falla la CI si una ruta importa `integrations/supabase` |

**Criterio de salida.** `grep -r "supabase" src/routes src/features/*/components
src/features/*/pages` = 0. `grep -c "as never" src` ≤ 5 con justificación.
Capturas idénticas al baseline.

**Riesgo.** Cambiar la forma de las query keys puede dejar pantallas sin
refrescar tras una mutación. Mitigación: cada mutación en Etapa 2 lleva un
test de Playwright que hace la acción y comprueba que la lista se actualiza
(los seis casos de uso de `docs/spec/03-casos-uso.md` marcados "sin test").

**RF que cita.** RF-PERF-1/2 (la capa `api` es donde entra la paginación, sin
tocar UI todavía), SPEC §7.2 (contratos), §7.5 paso 5.

### Etapa 3 — Descomponer los componentes sobrecargados

**Objetivo.** Ningún archivo de `features/` o `routes/` supera 250 líneas ni
tiene más de 5 `useState`. Los formularios usan react-hook-form + Zod.

| # | Tarea | Detalle |
|---|---|---|
| 3.1 | `shared/components` | `TarjetaKpi` (dashboard, informes, prevención), `FiltroSelect` (sanciones, documentos), `TablaDatos` con paginación, `EstadoCarga`, `EstadoVacio`, `EncabezadoPagina`. Cada uno reemplaza markup duplicado; se adopta `ui/card.tsx` en vez de `div` a mano |
| 3.2 | `features/expedientes/pages/PaginaFichaExpediente` | Se parte en `CabeceraExpediente`, `DatosExpediente`, `ListaDocumentos`, `HistorialActuaciones`, `Comentarios`, `CambioEstado`. Cada uno recibe datos por props o usa un hook de `api/` |
| 3.3 | `features/extraccion` (alta desde documento) | Los 13 `useState` pasan a un `useReducer` con estados explícitos: `inicial → subiendo → procesando → revisando → creando → creado | error`. Pasos como componentes: `PasoDocumento`, `PasoRevision`, `PasoConfirmacion`. La normalización de campos va a `model/normalizar.ts` con tests (hoy está duplicada con `sanciones.nueva`) |
| 3.4 | `features/analisis/components/PanelAnalisis` | Presentación pura; las 4 mutaciones salen a `api/mutations.ts`. Bloques (`Semaforo`, `Factores`, `RevisionProcedimiento`, `Fuentes`) como componentes |
| 3.5 | Flota: listado / alta / edición separados | `ListaVehiculos`, `FormularioVehiculo` (react-hook-form + Zod, reutilizado para crear y editar), `DialogoBorrar`. Mismo patrón para conductores y miembros: **un solo esqueleto, tres instancias** |
| 3.6 | `features/borradores`: editor sin `useEffect` de sincronización | El texto editado vive en el formulario; la versión guardada viene de la query. Se elimina la copia query→estado local que hoy causa pérdida de edición |
| 3.7 | `features/alta` (autoservicio) | Separar `index.tsx` en `PaginaAcceso` con `FormularioLogin` y `AsistenteAlta`. **No** corregir aquí los hallazgos 1–5 de `CAMBIOS-LOVABLE.md`: son cambios de comportamiento, requieren decisión de SPEC §3.10 primero. Se deja `// SPEC §3.10 pendiente` en el sitio |
| 3.8 | Dividir `lib/expediente.functions.ts` | En `features/*/server/` por servicio destino de §7.1. Sin cambiar lógica: solo mover |

**Criterio de salida.** Script en CI que falla si un archivo bajo `features/`
o `routes/` supera 250 líneas. Capturas idénticas. Los 7 casos de uso de
`03-casos-uso.md` con test de Playwright.

**Riesgo.** El wizard de extracción (3.3) es el flujo con más estados
intermedios y donde una regresión cuesta más. Mitigación: se hace **el último**
de la etapa, con los estados del reducer testeados unitariamente antes de
tocar el JSX.

**RF que cita.** RF-ALTA-1/2, RF-FLOTA-2, RF-ANALISIS-*, RF-BORRADOR-*.

### Etapa 4 — Conectar con los microservicios y cerrar producción

**Objetivo.** `bff-web` deja de ser el monolito: cada `features/*/api/client.ts`
habla con su Worker cuando este existe, y con Supabase mientras no. Es
exactamente §7.5, ahora con un punto de cambio por feature.

| # | Tarea | Detalle |
|---|---|---|
| 4.1 | `features/plazos/api/client.ts` → `deadlines-service` | Ya existe el puente local (`deadlines-client.server.ts`). Pasa a binding de servicio en `wrangler.jsonc`. Se elimina `lib/plazos.ts` del frontend |
| 4.2 | Extracción, análisis y borradores → `@sanciona/ai-provider` | Los `server/` de esas tres features dejan de llamar a la pasarela de Lovable (ADR 0001) |
| 4.3 | Un adaptador por servicio a medida que se extraiga | `identity`, `fleet`, luego `sanctions` (orden de §7.5). El contrato ya está en `@sanciona/contracts` desde Etapa 2, así que cada cambio es "sustituir `client.ts`" |
| 4.4 | Eventos | `expediente.creado` deja de ser `crearAvisos()` cosido en `expediente.functions.ts` y pasa a una Queue (§7.2). El frontend solo ve que los avisos aparecen |
| 4.5 | Captura de errores y observabilidad | Sustituto definitivo de la telemetría de Lovable retirada en 1.3 |
| 4.6 | Valores hardcodeados (§1.3) | `PUBLIC_SITE_URL` obligatorio; planes desde `contracts` cuando SPEC §4 decida; tutorial regenerado o retirado |
| 4.7 | Pulido visual | Solo aquí, con la estructura estable, entra el trabajo de `frontend-design` / `ui-ux-pro-max`: sistema de tokens, estados de foco y error consistentes, accesibilidad. Es una etapa **separada** para que ningún cambio visual se mezcle con los estructurales |
| 4.8 | Despliegue | `wrangler deploy` de `bff-web` en CI tras verde; entorno de staging con el Supabase de test |

**Criterio de salida.** `apps/bff-web` desplegado en Cloudflare contra
staging; `multas-export/` marcado como solo lectura en `README.md`; SPEC §7.5
paso 5 cumplido para las features cuyo servicio existe.

**Riesgo.** Este es el único punto donde la decisión pendiente de §7.5 ("¿v1
desde el monolito o migración completa antes?") afecta: si se lanza v1 antes,
la Etapa 4 corre en paralelo a clientes reales. El diseño por features lo
permite porque cada adaptador se cambia solo.

---

## 4. Decisiones que este plan necesita

| # | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| D1 | ¿El refactor vive en `apps/bff-web` (nuevo) o en `multas-export/` (espejo)? | **`apps/bff-web`.** El espejo sigue siendo el punto de sync con Lovable; refactorizarlo se perdería en el siguiente export | Etapa 1 |
| D2 | ¿Se congela la edición en Lovable? | **Sí, tras la Etapa 1.** Mientras Lovable siga generando, cada sync se porta a mano feature a feature. Cuanto antes se congele, menos se porta. Es decisión de Jorge (propietario del proyecto en Lovable) | Coste de Etapas 2–3 |
| D3 | ¿Se mantiene TanStack Start con SSR? | **Sí.** Las rutas autenticadas ya tienen `ssr: false`; el SSR solo afecta a la pantalla pública. Cambiar de framework ahora es una reescritura, no un refactor | Etapa 1 (config de Vite) |
| D4 | ¿Supabase de test propio para Playwright? | **Sí, proyecto separado.** Sin datos sembrados reproducibles no hay baseline visual fiable. Va a `TAREAS-CRISTIAN.md` Bloque 2 | Etapa 1.7 |

---

## 5. Lo que este plan no hace

- No corrige los hallazgos de seguridad del alta en autoservicio
  (`CAMBIOS-LOVABLE.md` 1–5). Son cambios de comportamiento y van por SPEC
  §3.10, no por un refactor.
- No decide precios, plan comercial ni facturación (SPEC §4).
- No toca `services/deadlines-service` ni `packages/ai-provider`.
- No rediseña la UI. El pulido visual es la tarea 4.7, al final y aislada.
