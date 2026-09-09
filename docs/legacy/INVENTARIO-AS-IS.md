# PROYECTO "MULTAS" — INVENTARIO / DIAGNÓSTICO DEL ESTADO ACTUAL

> **Qué es este documento.** Un inventario fiel de lo que existe hoy en el proyecto,
> extraído directamente del código fuente y de la configuración de Lovable.
> **No es una especificación.** No propone mejoras, no reinterpreta intenciones y no
> describe lo que el sistema "debería" hacer. Cuando algo está incompleto, hardcodeado
> o es inconsistente, se marca como tal.
>
> - **Fecha de extracción:** 7 de septiembre de 2026
> - **Origen:** proyecto Lovable `2fb9758d-5b85-4abf-b2df-491abbd60d7b`
> - **Método:** descarga del ZIP oficial ("Download codebase") + lectura de la
>   consola de Lovable Cloud. No se modificó nada en Lovable.
> - **Código:** `multas-export/` (145 archivos)

---

## 0. Identificación del proyecto

| Dato | Valor |
|---|---|
| Nombre en Lovable | **Control de Multas** |
| Nombre de producto en la UI | **Sanciona Fleet** |
| Propietario | `jlinares_10` — workspace "Jorge's Lovable" |
| Creado | 25 de agosto de 2026 |
| Última actividad en el chat | 3 de septiembre de 2026 |
| URL publicada | `https://sanciona.lovable.app` |
| Dominio propio | **Ninguno configurado** |
| Repositorio Git | **Ninguno.** GitHub/GitLab sin conectar |

> ⚠️ **El proyecto no pertenece a la cuenta de Cristian Luna** (`clunacba@gmail.com`),
> sino a `jlinares_10`. Cualquier migración, cambio de propiedad o creación de
> repositorio debe acordarse con el propietario.

---

## 1. Propósito del proyecto

Confirmado a partir del copy de la landing (`src/routes/index.tsx`), del modelo de
datos y de la lógica de negocio:

**Software SaaS multiempresa para la gestión de expedientes sancionadores (multas) de
empresas españolas de transporte de mercancías por carretera.**

Texto literal de la landing:

> "Sanciona Fleet centraliza multas y expedientes sancionadores de empresas españolas
> de transporte de mercancías por carretera con flotas de 10 a 100 vehículos."

El alcance real va bastante más allá de un simple registro de multas. El sistema:

1. Recibe la notificación de la sanción como PDF o imagen.
2. **Extrae los datos automáticamente con un modelo de IA** (incluido OCR de escaneados).
3. Los contrasta con la flota y los conductores dados de alta, y con el CIF de la empresa.
4. **Calcula los plazos legales con un motor determinista** (pago con reducción,
   alegaciones, identificación del conductor, recurso).
5. **Genera un análisis preliminar del expediente con IA**: semáforo, recomendación,
   factores, revisión de procedimiento y de prueba, incoherencias y fuentes legales.
6. **Redacta borradores de alegaciones y recursos con IA**, versionados y con
   validación obligatoria por un rol de revisor jurídico.
7. Ofrece calendario de vencimientos, informes, avisos internos y analítica de prevención.

El pie de la landing declara literalmente: *"Prototipo funcional. La información
mostrada no constituye asesoramiento jurídico."*

---

## 2. Stack técnico real

| Capa | Tecnología |
|---|---|
| Plantilla Lovable | `tanstack_start_ts_current` (`.lovable/project.json`) |
| Framework | **TanStack Start** (SSR + server functions), **no** una SPA de Vite |
| Router | TanStack Router (file-based, `src/routeTree.gen.ts` generado) |
| UI | React 19, Tailwind CSS 4, shadcn/ui estilo "new-york", Radix, lucide |
| Estado servidor | TanStack Query 5 |
| Formularios | react-hook-form + Zod 3 |
| Gráficos | Recharts |
| Backend | **Supabase** (gestionado por Lovable Cloud) |
| Build | Vite 8 + **Nitro** (target Cloudflare por defecto) |
| Gestor de paquetes | **Bun** (`bun.lock`, `bunfig.toml`) |
| Entrada de servidor | `src/server.ts` (wrapper de errores SSR) |

**Dependencia propietaria crítica:** `vite.config.ts` no configura casi nada por sí
mismo; delega en `@lovable.dev/vite-tanstack-config` (devDependency `^2.15.0`), que
según su propio comentario ya incluye TanStack devtools, `tanstackStart`, `viteReact`,
`tailwindcss`, `tsConfigPaths`, Nitro, inyección de variables `VITE_*`, el alias `@`,
el dedupe de React/TanStack, los plugins de logging de errores y la detección de
sandbox. **El proyecto no compila sin ese paquete.**

### Estructura de carpetas

```
multas-export/
├── .env                       ← claves de Supabase (públicas) — NO está en .gitignore
├── .lovable/project.json      ← metadatos de plantilla Lovable
├── AGENTS.md                  ← aviso de Lovable sobre no reescribir historia git
├── bun.lock, bunfig.toml      ← Bun con guardia de supply-chain de 24 h
├── vite.config.ts             ← delega en @lovable.dev/vite-tanstack-config
├── supabase/
│   ├── config.toml            ← project_id
│   └── migrations/            ← 17 migraciones SQL (1.132 líneas) = esquema completo
└── src/
    ├── assets/                ← 6 JPG de tutorial + 2 punteros .asset.json (ver §7)
    ├── components/
    │   ├── ui/                ← 46 componentes shadcn/ui sin modificar
    │   ├── alta-documento.tsx ← 589 líneas: flujo de alta desde documento
    │   ├── panel-analisis.tsx ← 411 líneas: panel lateral de análisis
    │   ├── app-shell.tsx      ← layout y navegación
    │   └── etiquetas.tsx
    ├── hooks/                 ← use-datos, use-org, use-expediente, use-mobile
    ├── integrations/supabase/ ← clientes, middlewares de auth, tipos generados
    ├── lib/                   ← lógica de negocio (ver §5)
    └── routes/                ← 23 rutas (ver §4)
```

---

## 3. Autenticación y modelo de permisos

**Auth:** Supabase Auth con email + contraseña. Registro abierto (cualquiera puede
crear cuenta). Recuperación de contraseña por email con redirección a `/reset-password`.
Validación Zod: email ≤255, contraseña 8–72 caracteres.

**Guardia de rutas:** `src/routes/_authenticated/route.tsx` hace `beforeLoad` con
`supabase.auth.getUser()` y redirige a `/auth` si no hay sesión. Marcado `ssr: false`.

**Alta de empresa automática:** al entrar, `useEmpresaActiva()` llama a la RPC
`ensure_active_organization()`. Si el usuario no pertenece a ninguna empresa, la función
**crea una empresa nueva** con el nombre del perfil (o la parte del email antes de la @,
o "Mi empresa") y le asigna el rol `admin_empresa`. Si la RPC falla, redirige a
`/empresa-nueva`.

### Roles

Tres roles de empresa (enum `app_role` en Postgres):

| Valor en BD | Etiqueta en la UI | Puede |
|---|---|---|
| `admin_empresa` | Administrador de empresa | Todo lo de gestor + editar datos de empresa, cambiar roles, invitar y eliminar usuarios, borrar sanciones/análisis/borradores/extracciones |
| `gestor_sanciones` | Gestor de sanciones | Crear y modificar sanciones, vehículos, conductores, extracciones, plazos, análisis y borradores |
| `revisor_juridico` | **"Gestor legal"** | Editar y **validar** escritos; NO puede cambiar el estado de una sanción ni dar de alta vehículos o conductores |

Helpers en `src/hooks/use-org.ts`: `puedeGestionar()` = admin o gestor;
`esAdministrador()` = solo admin.

**Cuarto rol implícito — superadministrador de plataforma:** tabla `platform_admins` y
RPC `is_platform_admin()`. Da acceso a `/superadmin` (visión global de todas las
empresas) y a la gestión de roles en `/usuarios`. **No** da permiso para editar los
datos de una empresa en `/empresa`.

**Aislamiento multiempresa:** se apoya íntegramente en **Row Level Security** de
Postgres, con funciones `SECURITY DEFINER`: `is_org_member`, `has_org_role`,
`can_manage_records`, `shares_org_with`, `sanction_belongs_to_org`, `is_platform_admin`.
Todas las tablas tienen RLS activo.

**Invitaciones:** `/usuarios` inserta filas en `organization_invitations`. **No se envía
ningún email.** Cuando alguien se registra con ese correo, el trigger `handle_new_user()`
detecta la invitación pendiente, le da de alta en la empresa con el rol previsto y marca
la invitación como aceptada.

---

## 4. Rutas, pantallas y flujos de usuario

### 4.1 Tabla de rutas (23 rutas)

| Ruta | Acceso | Propósito | Tablas que toca |
|---|---|---|---|
| `/` | Pública | Landing comercial "Sanciona Fleet" | — |
| `/auth` | Pública | Login, registro y solicitud de recuperación | Supabase Auth |
| `/reset-password` | Pública | Fijar contraseña nueva desde el enlace del email | Supabase Auth |
| `/dashboard` | Auth | 5 KPIs, distribución por estado y categoría, últimos 6 expedientes | `sanctions` |
| `/sanciones` | Auth | Listado con 9 filtros | `sanctions`, `vehicles`, `drivers` |
| `/sanciones/nueva` | Auth | Alta desde documento (IA) + alta manual | `sanctions`, `sanction_documents`, `sanction_extractions`, `sanction_actions`, storage |
| `/sanciones/$id` | Auth | Ficha completa del expediente | `sanctions`, `sanction_documents`, `sanction_actions`, `sanction_comments`, `sanction_extractions`, `sanction_analyses`, `sanction_deadlines`, `sanction_drafts` |
| `/borradores/$id` | Auth | Editor de escritos con versiones | `sanction_drafts`, `sanction_draft_versions`, `sanction_actions` |
| `/vehiculos` | Auth | Listado de flota, alta y edición | `vehicles`, `sanctions` |
| `/vehiculos/$id` | Auth | Ficha del vehículo | `vehicles`, `sanctions` |
| `/conductores` | Auth | Listado de conductores, alta y edición | `drivers`, `sanctions` |
| `/conductores/$id` | Auth | Ficha del conductor | `drivers`, `sanctions` |
| `/calendario` | Auth | Calendario mensual de vencimientos | `sanctions` |
| `/documentos` | Auth | Repositorio documental (solo lectura) | `sanction_documents`, storage |
| `/informes` | Auth | 4 indicadores + 5 agrupaciones con export CSV | `sanctions` |
| `/avisos` | Auth | Notificaciones internas y marcado de leídas | `notifications` |
| `/prevencion` | Auth | Patrones y recomendaciones preventivas | `sanctions` |
| `/empresa` | Auth | Datos fiscales y de contacto de la empresa | `organizations` |
| `/empresa-nueva` | Auth | Alta de empresa si el usuario no tiene ninguna | `organizations`, `organization_members` |
| `/usuarios` | Auth | Miembros, cambio de rol e invitaciones | `organization_members`, `profiles`, `organization_invitations` |
| `/superadmin` | Superadmin | Visión global de todas las empresas | Todas, vía `supabaseAdmin` (service role) |
| `/tutorial` | Auth | Tutorial de 6 pasos con capturas | — (`localStorage`) |

### 4.2 Navegación (`src/components/app-shell.tsx`)

Menú lateral, en este orden exacto: **Resumen** (`/dashboard`) · **Sanciones** ·
**Plazos** (`/calendario`) · **Vehículos** · **Conductores** · **Documentos** ·
**Informes** · **Prevención** · **Avisos** · **Usuarios** · **Configuración**
(`/empresa`). Se añade **Superadministración** solo si `useEsSuperadmin()` es cierto.

La ocultación por superadmin es **la única regla de menú por rol**: `/usuarios` y
`/empresa` se muestran a todos los roles y el control de permisos es interno a cada
pantalla.

Rutas no enlazadas desde el menú: `/sanciones/nueva` (botón en dashboard y listado),
las fichas `$id`, `/borradores/$id` (solo desde el panel de análisis), `/tutorial`
(solo tras un registro con sesión inmediata) y `/empresa-nueva` (solo por redirección).

### 4.3 Flujo principal: alta de expediente desde documento

`src/components/alta-documento.tsx` (589 líneas) + `src/lib/expediente.functions.ts`.
Cuatro pasos declarados: *Documento recibido → Procesando documento → Revisar
información → Expediente creado*.

1. **Subida.** Drag & drop de PDF/JPG/JPEG/PNG, máximo **15 MB**. El archivo va al
   bucket `sanction-documents` con la ruta `{orgId}/entrada/{timestamp}-{nombre}`.
   Se inserta una fila en `sanction_extractions`.
2. **Extracción (`procesarDocumento`).** Server function. Descarga el archivo, lo
   convierte a base64 y lo envía al gateway de IA con el prompt `SISTEMA_EXTRACCION`,
   que pide un JSON con ~48 campos posibles, cada uno con **valor, nivel de confianza
   (Alto/Medio/Bajo) y fragmento literal de origen**. El prompt prohíbe expresamente
   inventar datos y obliga a devolver `null` cuando el dato no aparece.
3. **Asociación automática.** Cruza la matrícula extraída (normalizada sin separadores)
   contra `vehicles`, y el nombre o el DNI del conductor contra `drivers`. Si no
   encuentra el vehículo añade el aviso "Vehículo no localizado en la flota registrada".
   El estado resultante es `Revisión requerida` si hay algún campo de confianza baja o
   algún aviso; si no, `Información extraída`.
4. **Revisión humana.** La UI muestra cada campo con su etiqueta en español, marca
   "Verificar dato" los de confianza baja, y permite editarlos. Normaliza la
   identificación del conductor a Sí/No/Pendiente de confirmar y deduce el tipo de
   infracción por expresiones regulares si el modelo devolvió algo genérico.
5. **Control de coherencia con la empresa.** Compara CIF y razón social del documento
   con los de la empresa activa. **Si el CIF no coincide, bloquea la creación** hasta
   que el usuario pulse explícitamente "Continuar de todos modos". Además ejecuta
   `validarAntesDeCrear()`, que exige 7 campos obligatorios y detecta importes
   inválidos y fechas incoherentes.
6. **Creación (`crearExpedienteDesdeExtraccion`).** Inserta la sanción con ~30 campos,
   crea el documento asociado, calcula y guarda los plazos, y registra hasta 5
   actuaciones en el historial: registro del expediente, extracción documental,
   corrección manual de datos, discrepancias detectadas y confirmación expresa del
   usuario. Si el conductor no está identificado, el estado inicial es
   `Pendiente de identificación del conductor`. Genera avisos en `notifications`.

### 4.4 Flujo de análisis y escritos

- **`analizarExpediente`**: reúne el expediente, sus documentos, la última extracción
  y **el catálogo completo de `legal_sources`**, recalcula los plazos y lo envía todo al
  modelo con el prompt `SISTEMA_ANALISIS`. Borra el análisis anterior (`delete` por
  `sanction_id`) e inserta el nuevo. Actualiza `sanctions.recommended_action`,
  `traffic_light` y `analysis_status`, registra una actuación y crea un aviso.
- **`generarBorrador`** (`Alegaciones` | `Recurso`): genera el escrito con el prompt
  `SISTEMA_BORRADOR` y crea `sanction_drafts` + `sanction_draft_versions` v1.
- **Validación humana obligatoria:** en `/borradores/$id` el estado "Validado" está
  deshabilitado para quien no sea `revisor_juridico`, y además se comprueba en la
  mutación con el mensaje "Solo un revisor jurídico puede validar el escrito".
  Mientras el estado no sea "Validado" se muestra un aviso permanente.
- Guardar versión exige **≥50 caracteres** e incrementa `current_version`.

---

## 5. Lógica de negocio en el código

### 5.1 Motor de plazos (`src/lib/plazos.ts`, 294 líneas)

Determinista, sin IA. Es la pieza de negocio más definida del proyecto.

**Cuatro tipos de plazo:** Pago con reducción · Alegaciones · Identificación del
conductor · Recurso.

**Reglas por régimen sancionador**, decididas por coincidencia de texto en el nombre
del organismo:

| Régimen | Detección (substring, minúsculas) | Reglas aplicadas |
|---|---|---|
| Tráfico | `dgt`, `guardia civil`, `tráfico`, `trafico`, `ayuntamiento` | Pago con reducción: **20 días naturales** (fiable) · Alegaciones: **20 días naturales** (fiable) · Identificación del conductor: **15 días naturales** (no fiable) |
| Transporte | `transporte`, `ministerio`, `inspección` | Alegaciones: **15 días hábiles** (no fiable) · Pago con reducción: **15 días hábiles** (no fiable) |
| Genérico (resto) | — | Alegaciones: **15 días hábiles** (no fiable) |
| Siempre | — | Recurso: **1 mes** desde la notificación de la resolución (no fiable) |

**Reglas de cómputo:**
- El inicio es `notification_date`, y si falta, `reception_date`.
- **Nunca se calcula un plazo desde la fecha de emisión.** Si no hay fecha de
  notificación ni recepción, el plazo queda como `Plazo pendiente de determinar`.
- Si el documento trae una fecha límite expresa, **el documento manda**, pero se
  contrasta con el cálculo interno: diferencia ≤1 día → `Confirmado`; diferencia mayor
  → `Pendiente de verificación`, indicando los días de discrepancia.
- Si solo hay cálculo interno: `Calculado` si la regla es fiable,
  `Pendiente de verificación` si no lo es.
- Cualquier fecha ya pasada pasa a `Vencido`, salvo que estuviera en
  `Pendiente de verificación`.
- El plazo de identificación del conductor solo se calcula si
  `requires_driver_identification` es cierto.

**Estados de plazo:** Confirmado · Calculado · Pendiente de verificación · Vencido ·
Plazo pendiente de determinar · Sin datos.

**Días hábiles:** excluye sábados, domingos y una lista fija de **9 festivos
nacionales de fecha fija** (1 y 6 de enero, 1 de mayo, 15 de agosto, 12 de octubre,
1 de noviembre, 6 y 8 de diciembre, 25 de diciembre).
⚠️ **No contempla festivos autonómicos, locales ni móviles** (Semana Santa). Está
documentado en el propio código.

### 5.2 Estados del expediente (enum `sanction_status`, 12 valores)

`Nueva` · `Pendiente de documentación` · `Pendiente de identificación del conductor` ·
`Pendiente de revisión` · `Pagar con descuento` · `Preparar alegaciones` ·
`Alegaciones presentadas` · `Recurso presentado` · `Resuelta favorablemente` ·
`Resuelta desfavorablemente` · `Pagada` · `Archivada`.

Los 8 primeros se consideran **abiertos** (`ESTADOS_ABIERTOS` en `fleet.ts`), y esa
lista alimenta los KPIs del dashboard y de informes.

**No existe máquina de estados.** Cualquier gestor puede pasar de cualquier estado a
cualquier otro desde un `<select>`; lo único que se registra es una actuación de tipo
"Cambio de estado". No hay transiciones prohibidas ni validaciones de coherencia.

### 5.3 Semáforo de alerta de plazos (`nivelPlazo()` en `fleet.ts`)

`Archivada` → archivado · `Resuelta favorablemente` → resuelto ·
`Pagada` / `Resuelta desfavorablemente` → normal · vencido (<0 días) ·
**crítico (≤2 días)** · **próximo (≤7 días)** · normal.

### 5.4 Semáforo del análisis (`src/lib/analisis.ts`)

Verde = "Expediente aparentemente correcto" · Naranja = "Revisión recomendada" ·
Rojo = "Actuación urgente" · **Gris = "Información insuficiente"** (valor por defecto
y de respaldo si el modelo devuelve algo no válido).

**7 recomendaciones posibles:** Pagar con reducción · Revisar · Solicitar documentación ·
Identificar conductor · Preparar alegaciones · Preparar recurso · Revisión jurídica.

**Nivel de confianza:** Alto / Medio / **Bajo** (valor de respaldo).

**7 campos críticos** que se marcan con "Verificar dato" cuando la confianza es baja:
`matricula`, `numero_expediente`, `importe_original`, `fecha_notificacion`,
`fecha_limite_pago_reducido`, `articulo`, `conductor_nombre`.

**Checklist documental base** de 10 documentos (notificación completa, pruebas
gráficas, expediente administrativo, identificación del conductor, datos de tacógrafo,
certificado de verificación del instrumento de medida, carta de porte, documentación
del vehículo, autorización de transporte, justificante de pago).

### 5.5 Salvaguardas jurídicas en los prompts (`src/lib/expediente.server.ts`)

Los tres prompts de sistema contienen reglas de negocio explícitas y bastante
elaboradas. Resumen fiel de las principales:

- **Separación de regímenes:** prohibición expresa de mezclar normativa de Tráfico con
  la de Transportes. La reducción del 50 % (art. 94 RDL 6/2015) solo se aplica si el
  procedimiento es realmente de tráfico. En tacógrafo se distingue Reglamento (UE)
  165/2014 de Reglamento (CE) 561/2006 para tiempos de conducción y descanso.
- **Solo fuentes verificadas:** el modelo únicamente puede citar normas del catálogo
  `legal_sources` que se le pasa en el prompt. Si necesita otro fundamento, debe añadir
  el factor "Requiere comprobación jurídica" en lugar de citarlo.
- **El modelo no calcula plazos:** se le entregan ya calculados por el motor
  determinista y solo puede comentarlos.
- **Prohibido garantizar resultados** o dar probabilidades de éxito.
- Si el régimen o el procedimiento no están claros: semáforo Gris y todo presentado
  como hipótesis.
- En los borradores, los datos que falten se escriben como `[PENDIENTE DE COMPLETAR]`,
  y no se puede pedir en el SUPLICO que se tenga por cumplida la identificación del
  conductor si los datos no constan completos.
- Estructura obligatoria del escrito: ORGANISMO DESTINATARIO / EXPEDIENTE /
  IDENTIFICACIÓN DEL INTERESADO / HECHOS / ALEGACIONES / FUNDAMENTOS JURÍDICOS /
  DOCUMENTACIÓN QUE SE APORTA / SOLICITA / LUGAR Y FECHA.

### 5.6 Otras reglas dispersas

- **Parseo de importes** (`parseImporte`): soporta formato español e inglés
  (`500,50`, `1.001,00`, `1,001.00`) resolviendo cuál es el separador decimal.
- **Deducción del tipo de infracción** (`validacion-extraccion.ts`): 12 patrones de
  expresión regular en orden de prioridad.
- **Comparación de razón social**: normaliza mayúsculas, acentos y sufijos societarios
  (S.L., S.A., SLU, SAU) antes de comparar, y acepta coincidencia por inclusión.
- **Recomendaciones de prevención** (`/prevencion`): reglas fijas en el propio archivo
  — categoría dominante en los últimos 92 días, vehículo con ≥2 expedientes, conductor
  con ≥2 expedientes y número de expedientes sin conductor asignado.
- **Generación de documentos** (`documento.ts`): HTML con Arial 11 pt, interlineado
  1,15, A4 con márgenes de 2,5 cm; las líneas en mayúsculas se convierten en títulos.

---

## 6. Modelo de datos (Supabase / PostgreSQL)

Proyecto Supabase `yaqnvsijescamfjfncus`, gestionado por Lovable Cloud.
**22 tablas**, todas con RLS activo. El esquema completo está en
`multas-export/supabase/migrations/` (17 migraciones, de 25/08/2026 a 03/09/2026).

### 6.1 Tablas y volumen actual

| Tabla | Filas | Función |
|---|---:|---|
| `organizations` | 6 | Empresas (razón social, CIF, dirección, contacto) |
| `organization_members` | 6 | Pertenencia usuario↔empresa con rol y estado |
| `organization_invitations` | 1 | Invitaciones pendientes por email |
| `profiles` | 6 | Perfil del usuario, espejo de `auth.users` |
| `platform_admins` | 2 | Superadministradores de la plataforma |
| `vehicles` | 8 | Flota |
| `drivers` | 10 | Conductores |
| `sanctions` | 21 | **Tabla central**: el expediente sancionador |
| `sanction_documents` | 4 | Documentos adjuntos al expediente |
| `sanction_extractions` | 7 | Resultado de la extracción por IA |
| `sanction_deadlines` | 27 | Plazos calculados |
| `sanction_analyses` | 10 | Análisis preliminar por IA |
| `sanction_drafts` | 5 | Escritos (alegaciones / recursos) |
| `sanction_draft_versions` | 6 | Versiones inmutables de cada escrito |
| `sanction_actions` | 21 | Historial de actuaciones (inmutable) |
| `sanction_comments` | 0 | Comentarios internos |
| `sanction_outcomes` | 0 | Resultados para analítica de estrategias |
| `notifications` | 23 | Avisos internos |
| `activity_logs` | 8 | Auditoría por empresa |
| `document_access_logs` | 0 | Auditoría de acceso a documentos |
| `legal_sources` | 10 | **Catálogo jurídico compartido** (solo lectura) |
| `integration_endpoints` | 0 | Integraciones futuras (solo estructura) |

Storage: un bucket, **`sanction-documents`**, con políticas RLS que exigen que la
primera carpeta de la ruta sea el `organization_id` del usuario.

### 6.2 Relaciones principales

```
auth.users ──1:1── profiles
     │
     └──N:M── organizations  (vía organization_members, con rol y estado)
                   │
                   ├── vehicles ──┐
                   ├── drivers  ──┤
                   │              ↓
                   └────────── sanctions  (vehicle_id, driver_id opcionales)
                                    │
                                    ├── sanction_documents ── sanction_extractions
                                    ├── sanction_deadlines   (UNIQUE sanction_id + deadline_type)
                                    ├── sanction_analyses
                                    ├── sanction_drafts ── sanction_draft_versions (UNIQUE draft_id + version)
                                    ├── sanction_actions
                                    ├── sanction_comments
                                    ├── sanction_outcomes    (UNIQUE sanction_id)
                                    └── notifications

legal_sources  (global, sin organization_id — compartido por todas las empresas)
```

**Toda tabla de negocio lleva `organization_id`** con `ON DELETE CASCADE`, que es el eje
del aislamiento multiempresa.

### 6.3 La tabla `sanctions` en detalle

Es la entidad central, con ~50 columnas acumuladas en dos oleadas.

**Bloque original:** `reference_number`, `sanctioning_authority`, `sanction_category`,
`description`, `violation_date`, `notification_date`, `payment_deadline`,
`appeal_deadline`, `original_amount`, `discounted_amount`, `points`, `vehicle_id`,
`driver_id`, `status`, `recommended_action`, `priority`, `notes`, `created_by`.

**Bloque añadido para la extracción documental:** `infraction_time`, `location`, `road`,
`kilometer_point`, `municipality`, `province`, `legal_norm`, `legal_article`,
`legal_section`, `qualification`, `reported_facts`, `surcharge_amount`,
`discount_percentage`, `requires_driver_identification`,
`driver_identification_deadline`, `denouncing_agent`, `evidence_mentioned`,
`complaint_date`, `issue_date`, `reception_date`, `traffic_light`, `analysis_status`.

⚠️ **Todo el segundo bloque solo lo rellena el alta desde documento.** El alta manual
deja esos campos vacíos.

### 6.4 Tipos enumerados

- `app_role`: `admin_empresa`, `gestor_sanciones`, `revisor_juridico`
- `member_status`: `activo`, `invitado`, `inactivo`
- `sanction_status`: 12 valores (§5.2)
- `sanction_priority`: `Baja`, `Normal`, `Alta`, `Crítica` — más `Media`, valor
  original que se dejó de usar pero **sigue existiendo en el enum** (ver §8)

### 6.5 Funciones y triggers

**Funciones `SECURITY DEFINER`:** `is_org_member`, `has_org_role`, `can_manage_records`,
`shares_org_with`, `sanction_belongs_to_org`, `is_platform_admin`,
`ensure_active_organization`, `handle_new_user`, `set_updated_at`.
`is_demo_org` es `IMMUTABLE`. Todas revocadas para `PUBLIC` y `anon`.

**Triggers:** `on_auth_user_created` sobre `auth.users` (crea el perfil y procesa
invitaciones pendientes) y `set_updated_at` en 9 tablas.

**Tablas de solo-añadir (append-only):** `sanction_actions`, `sanction_draft_versions` y
`document_access_logs` tienen políticas explícitas `UPDATE ... USING (false)` y
`DELETE ... USING (false)`. `sanction_documents` no admite `UPDATE`.

### 6.6 Catálogo jurídico precargado (`legal_sources`, 10 entradas)

Ley 39/2015 (arts. 30 y 40) · RDL 6/2015 de Tráfico (arts. 94, 11 y 112) ·
Ley 16/1987 LOTT (arts. 140 y 141) · Reglamento (CE) 561/2006 (arts. 6 y 8) ·
Reglamento (UE) 165/2014 (art. 34). Cada entrada incluye resumen, fecha de versión,
fuente oficial (BOE / DOUE) y URL.

⚠️ Es una tabla **global sin `organization_id`**, legible por cualquier usuario
autenticado de cualquier empresa, y **solo escribible por `service_role`**: no hay
ninguna pantalla para mantenerla.

### 6.7 Datos actuales: demo vs. reales

El historial del chat de Lovable y la migración `20260826144708` confirman que los
datos de negocio son **una empresa de demostración sembrada**:
**"Transportes Levante Demo, S.L."** (CIF B98765432, Paterna, Valencia), con
8 vehículos, 10 conductores y 12 sanciones de ejemplo (EXP-2026-0001 a EXP-2026-0012),
todas con fechas relativas a `current_date`.

Lo que **sí es real** son las **6 cuentas de usuario** y sus 6 empresas asociadas.

---

## 7. Integraciones externas y credenciales

### 7.1 Servicios que usa el proyecto

| Servicio | Uso | Estado |
|---|---|---|
| **Supabase** (vía Lovable Cloud) | Base de datos, Auth, Storage | Activo, es el backend completo |
| **Lovable AI Gateway** | Extracción documental, análisis y redacción de escritos | Activo — **bloqueante para migrar** |
| Lovable Cloud Emails | Envío de correo desde dominio propio | Presente en la consola, **sin configurar** |
| Lovable Assets (R2) | 2 imágenes de la landing | Activo — **bloqueante para migrar** |
| Stripe / pagos | — | **No hay ninguna integración de pagos** |
| Edge functions | — | **Ninguna desplegada** |
| Cron / Jobs | Infra presente (`cron-auth.ts`) | **Ningún job definido** |
| `integration_endpoints` | Tabla preparada para integraciones futuras | Vacía, sin UI |

### 7.2 El gateway de IA — dependencia crítica

`src/lib/expediente.server.ts`:

```
GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions"
MODELO_EXTRACCION = "google/gemini-3.7-flash"
MODELO_ANALISIS   = "google/gemini-3.7-flash"
Autenticación: Bearer ${process.env.LOVABLE_API_KEY}
```

Es un endpoint compatible con la API de OpenAI, pero **propiedad de Lovable y facturado
con los créditos del workspace de Lovable**. El código incluso traduce los errores:
402 → "No hay créditos suficientes… El administrador del espacio debe añadir créditos";
403 → "El procesamiento automático está deshabilitado en este espacio de trabajo".

**Fuera de Lovable, `LOVABLE_API_KEY` no existe y las tres funciones de IA dejan de
funcionar**: extracción documental, análisis del expediente y generación de borradores.
Es decir, el diferencial del producto. La migración exige repuntar `llamarModelo()` a
un proveedor propio (Google AI Studio, OpenAI, Anthropic, OpenRouter…). El cambio es
acotado: una sola función y una sola URL.

### 7.3 Variables de entorno

**Presentes en el ZIP** (`multas-export/.env`) — claves **públicas** por diseño, aptas
para el navegador:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | `https://yaqnvsijescamfjfncus.supabase.co` |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | `yaqnvsijescamfjfncus` |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_g9CP…` (clave publicable, no secreta) |

**NO presentes en el ZIP, pero necesarias en producción** — Lovable las inyecta en
tiempo de ejecución y hay que obtenerlas antes de desplegar:

| Variable | Para qué | Dónde se usa |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta.** Cliente admin que salta el RLS | `client.server.ts`, necesaria para `/superadmin` |
| `LOVABLE_API_KEY` | **Secreta.** Gateway de IA | `expediente.server.ts` |
| `LOVABLE_CRON_SECRET` | Autenticación de trabajos programados | `cron-auth.ts` (sin uso actual) |

En la consola de Lovable (Cloud → Secrets) solo figuran `LOVABLE_API_KEY` y
`LOVABLE_CRON_SECRET`, ambas gestionadas por la plataforma. **No hay ningún secreto
propio del proyecto**, ni claves de pagos, ni de terceros.

> **Nota de seguridad.** Ninguna clave secreta se ha copiado a este documento ni a
> ningún archivo del entorno. Las únicas claves presentes en `multas-export/.env` son
> las publicables de Supabase, que van embebidas en el bundle del navegador y no son
> confidenciales. `SUPABASE_SERVICE_ROLE_KEY` y `LOVABLE_API_KEY` **no** están en el
> export y deberán obtenerse aparte y guardarse en un `.env.local` fuera de git.

### 7.4 Imágenes de la landing — no viajan en el ZIP

`src/assets/camion-carretera.jpg` y `carretera-flota.jpg` **no son archivos**: son
punteros `.asset.json` a objetos alojados en el almacenamiento R2 de Lovable
(`/__l5e/assets-v1/<uuid>/<nombre>.jpg`). Además, `src/routes/index.tsx:15` construye la
imagen de portada con **dominio absoluto hardcodeado**:

```js
const IMAGEN_PORTADA = `https://sanciona.lovable.app${camionCarretera.url}`;
```

Consecuencia: fuera de Lovable, la imagen del hero (`carreteraFlota.url`, ruta
relativa) **se rompe**, y la imagen de Open Graph seguirá apuntando al dominio de
Lovable. Hay que descargar ambas imágenes y servirlas desde `public/`.
Las 6 capturas del tutorial (`src/assets/tutorial/*.jpg`) sí son archivos reales y
están incluidas.

---

## 8. Hallazgos: lo incompleto, hardcodeado o inconsistente

Esta sección documenta el estado real, sin corregirlo ni suavizarlo. Es el insumo más
relevante para la especificación formal.

### 8.1 🔴 Riesgos de seguridad

1. **Contraseña en texto plano dentro de una migración.**
   `supabase/migrations/20260903190210_*.sql` ejecuta un `UPDATE auth.users` que fija la
   contraseña de `jorgelinares10@gmail.com` a **`12345678`**, confirma su email y le
   levanta cualquier bloqueo. Queda registrado de forma permanente en el historial de
   migraciones y se re-aplicaría en cualquier entorno nuevo. **Esa contraseña debe
   cambiarse y la migración neutralizarse antes de subir el código a ningún repositorio.**

2. **Emails personales hardcodeados en migraciones.**
   `20260826144708_*.sql` da de alta como administradores a `jorgelinares10@gmail.com` y
   `jorgelinarescunat@gmail.com` por email literal.

3. **UUIDs de superadministrador hardcodeados.**
   `20260901191809_*.sql` inserta dos UUID fijos en `platform_admins`
   (`dc8d2a68-…` y `03f2ecbd-…`). No hay ninguna pantalla para gestionar esa tabla.

4. **`.env` incluido en el export y NO listado en `.gitignore`.**
   Aunque solo contiene claves publicables, el archivo se subiría tal cual al primer
   commit. Conviene añadir `.env` al `.gitignore` y dejar un `.env.example`.

5. **`/sanciones/$id` no filtra por `organization_id`** en ninguna de sus cuatro
   consultas (`sanctions`, `sanction_documents`, `sanction_actions`,
   `sanction_comments`). El aislamiento multiempresa depende al 100 % de que las
   políticas RLS estén bien. El resto de hooks sí hacen `.eq("organization_id", orgId)`.
   No es un fallo explotable hoy, pero elimina la defensa en profundidad.

### 8.2 🔴 Funcionalidad rota o ausente

6. **El formulario de alta manual de sanciones no tiene botón de envío.**
   En `src/routes/_authenticated/sanciones.nueva.tsx` existe el `onSubmit` y la mutación
   `crear`, pero **no hay ningún `<Button type="submit">`**. El JSX está envuelto en un
   `{( … )}` sin condición, resto de una condicional eliminada. En la práctica, **la
   única vía real de alta de expedientes es la subida de documento con IA.**

7. En ese mismo archivo, los estados `archivo` y `tipoDoc` se declaran y se usan en la
   mutación, pero **no hay ningún control de subida de archivo** en el formulario
   manual; el tipo de documento queda fijado siempre a `TIPOS_DOCUMENTO[0]`.

8. **No existe borrado en ninguna pantalla** de vehículos, conductores, sanciones,
   documentos ni comentarios. Solo se pueden borrar invitaciones. Las políticas RLS de
   borrado sí existen en la base de datos, pero no hay UI que las use.

9. **`/documentos` no permite subir documentos**, pese a presentarse como el
   repositorio documental. La subida solo existe dentro de `/sanciones/nueva`.

10. **"Exportar a PDF" no genera un PDF.** En `/borradores/$id` abre una ventana con el
    HTML y llama a `window.print()`. "Descargar documento editable" produce un archivo
    `.doc` que en realidad es HTML con MIME `application/msword`.

11. **El botón "Comparar" versiones no compara nada**: solo despliega el texto de la
    versión. No hay diff. "Restaurar este texto en el editor" carga el texto pero no
    guarda.

12. **`document_access_logs` nunca se escribe.** La tabla, sus políticas y sus índices
    existen; ningún punto del código inserta en ella. El tutorial, sin embargo, promete
    "registro de accesos y descargas".

13. **`sanction_outcomes` nunca se escribe.** Tabla diseñada para la analítica de
    estrategias (importe evitado, resolución favorable, días de resolución); ninguna
    pantalla ni función la rellena. El módulo de analítica de resultados no existe.

14. **`integration_endpoints` está vacía y sin UI.** Solo estructura.

### 8.3 🟠 Valores hardcodeados

15. `src/lib/superadmin.functions.ts` — UUID fijo
    `DEMO_ORG_ID = "11111111-1111-4111-8111-111111111111"` para excluir la empresa
    demo de la visión global. Duplica la RPC `is_demo_org` que existe en la base de
    datos pero que el frontend nunca llama.
16. `src/routes/index.tsx` — dominio absoluto `https://sanciona.lovable.app` (§7.4).
    Además `CIFRAS` y `CARACTERISTICAS` son listas fijas de copy comercial.
17. **`ORGANISMOS` (`fleet.ts`) es una lista cerrada y sesgada geográficamente:**
    DGT, Guardia Civil de Tráfico, Ministerio de Transportes, Ayuntamientos de
    **Valencia, Alicante y Castellón**, y "Otro organismo". **No hay campo libre.**
    Una multa de Madrid o Barcelona solo puede registrarse como "Otro organismo" —
    lo que además afecta al motor de plazos, que detecta el régimen por el texto del
    organismo (§5.1).
18. `ESTADOS_FLOTA` y `ESTADOS_CONDUCTOR` (`["activo","inactivo"]`) están definidos
    localmente en sus respectivas rutas en vez de en `fleet.ts`.
19. Clave de `localStorage` `"sanciona-tutorial-visto"` repetida como literal en
    `auth.tsx` y `tutorial.tsx`, sin constante compartida.
20. Los 9 festivos del motor de plazos, y la ausencia de festivos autonómicos y
    móviles (§5.1).

### 8.4 🟠 Inconsistencias

21. **La prioridad "Media" no existe pero se usa.** `PRIORIDADES` es
    `["Baja","Normal","Alta","Crítica"]`, pero `sanciones.nueva.tsx` inicializa
    `prioridad = "Media"`. `CLASES_PRIORIDAD` incluye ambas. El filtro del listado
    nunca podrá seleccionar "Media". Es un renombrado a medio hacer.
22. **Dos catálogos de categorías distintos y sin relación:** `CATEGORIAS` en
    `fleet.ts` (14 valores, usado en el alta manual y en el filtro) y
    `CATEGORIAS_INFRACCION` en `validacion-extraccion.ts` (10 valores, usado en el alta
    desde documento). Nada garantiza que coincidan, y el alta por IA escribe en el mismo
    campo `sanction_category`.
23. **El "plazo relevante" se calcula de tres formas distintas.** La función
    `plazoRelevante()` está duplicada literalmente en `dashboard.tsx` y
    `sanciones.index.tsx`, en `sanciones.$id.tsx` se hace inline, y las fichas de
    vehículo y conductor usan **solo `payment_deadline`**, ignorando `appeal_deadline`.
    **La misma sanción muestra fechas límite distintas según la pantalla.** Además la
    comparación se hace sobre cadenas de texto, no sobre fechas.
24. **`TIPOS_ACTUACION` (8 valores en `fleet.ts`) no se usa en ninguna ruta.** Las
    actuaciones se insertan con literales sueltos. En `/borradores/$id` se registra
    `action_type: "Cambio de estado"` incluso para "Nueva versión N del escrito".
25. **`sanction_deadlines` se calcula y se guarda, pero el resto de la aplicación no lo
    usa.** El calendario, el dashboard y los listados leen los campos planos
    `payment_deadline` / `appeal_deadline` de `sanctions`, no la tabla de plazos con sus
    estados ("Pendiente de verificación", "Plazo pendiente de determinar"). El motor de
    plazos solo se ve en el panel de análisis de la ficha.
26. **El rol `revisor_juridico` se etiqueta como "Gestor legal"** en `ROLES`, pero toda
    la UI y los mensajes de error hablan de "revisor jurídico".
27. **Un superadministrador puede cambiar roles en `/usuarios` pero no puede editar los
    datos de la empresa en `/empresa`**, que solo comprueba `esAdministrador`.
28. Los comentarios guardan `created_by` pero **la ficha nunca muestra el autor**, solo
    la fecha. Además cualquier rol puede comentar, sin comprobar `puedeGestionar`.
29. **`recommended_action` se escribe** (por `analizarExpediente`) **pero no se muestra
    en ninguna pantalla.**
30. **`/prevencion` agrupa por `municipality` con un cast** (`s as { municipality?… }`),
    campo que no está en el tipo `Sancion` y que **solo rellena el alta desde
    documento**. Para expedientes creados a mano, ese bloque queda vacío.
31. **Sin paginación en ninguna parte.** `useSanciones` carga todas las sanciones sin
    `limit`, y todos los filtros y búsquedas son en cliente. Las fichas de vehículo y
    conductor cargan la lista completa para localizar un registro
    (`vehiculos.find(...)`) en vez de consultar por id. Con 21 filas no se nota;
    con una flota real, sí.
32. El tutorial describe funciones que no existen tal cual: registro de accesos y
    descargas (§8.2 #12), "importes pagados, evitados y descuentos aplicados" en
    informes (solo hay pagado, abierto y ahorro potencial) y un aviso de "plazo
    pendiente de determinar" en el calendario (el calendario solo pinta fechas
    existentes; una sanción sin plazos simplemente no aparece).
33. Los estados de miembro e invitación se comparan con literales en español en el
    cliente (`status === "pendiente"`, `.eq("status","activo")`), sin tipo compartido.
34. **No hay ningún test.** Ni unitarios, ni de integración, ni E2E. Tampoco CI.

---

## 9. Bloqueadores para salir de Lovable

Ordenados por dificultad. Ninguno es insalvable, pero todos hay que resolverlos.

| # | Bloqueador | Impacto | Naturaleza |
|---|---|---|---|
| 1 | **`LOVABLE_API_KEY` + `ai.gateway.lovable.dev`** | Sin él dejan de funcionar extracción, análisis y borradores: el núcleo del producto | Cambiar la URL y la cabecera en `llamarModelo()` (`expediente.server.ts`) por un proveedor propio. Una sola función |
| 2 | **`@lovable.dev/vite-tanstack-config`** | Sin él el proyecto **no compila**: aporta plugins, Nitro, alias y la inyección de `VITE_*` | Paquete npm público: puede seguir usándose, o reemplazarse por una config Vite/TanStack Start explícita |
| 3 | **`SUPABASE_SERVICE_ROLE_KEY`** | `/superadmin` falla al arrancar el cliente admin | Obtenerla del proyecto Supabase y ponerla como variable de entorno del servidor |
| 4 | **Imágenes de la landing en R2 de Lovable** (§7.4) | Hero roto y Open Graph apuntando a `sanciona.lovable.app` | Descargar 2 imágenes, ponerlas en `public/` y quitar el dominio hardcodeado |
| 5 | **Propiedad del proyecto Supabase** | La base de datos vive dentro de Lovable Cloud | Decidir si se reclama el proyecto Supabase o se migra a uno propio con las 17 migraciones |
| 6 | **Hosting SSR** | Es TanStack Start con Nitro, **no** un sitio estático | Cloudflare Workers (target por defecto de Nitro) o Vercel/Netlify con adaptador SSR. **Cloudflare Pages estático no sirve** |
| 7 | Migración con contraseña en claro (§8.1 #1) | Riesgo de seguridad al replicar el esquema | Neutralizar antes de cualquier `db reset` o entorno nuevo |
| 8 | Cliente Supabase con `brokeredPreviewStorage()` | Solo se activa en dominios de Lovable; fuera cae a `localStorage` | Funciona sin cambios, pero es código muerto en producción propia |

### Sobre el despliegue

- El build es `vite build` con Nitro; el target por defecto de
  `@lovable.dev/vite-tanstack-config` es **Cloudflare**, así que **Cloudflare Workers**
  es el camino de menor fricción.
- `.gitignore` ya contempla `.wrangler/` y `.dev.vars`, lo que refuerza esa hipótesis.
- El gestor de paquetes es **Bun** (`bun.lock`, `saveTextLockfile`, guardia de
  supply-chain de 24 h). Conviene mantenerlo para no invalidar el lockfile.
- Variables de servidor necesarias en producción: `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y la clave del proveedor de
  IA que sustituya a `LOVABLE_API_KEY`. Las tres primeras también en su versión
  `VITE_*` para el bundle de cliente.

---

## 10. Resumen ejecutivo del estado actual

**Lo que está sólido:**

- El **modelo de datos** está bien pensado: multiempresa real, RLS en las 22 tablas,
  funciones `SECURITY DEFINER` con privilegios revocados, tablas de auditoría
  append-only y trazabilidad del expediente.
- El **motor de plazos** es determinista, está separado de la IA, distingue régimen de
  tráfico y de transporte, contrasta documento contra cálculo y se niega explícitamente
  a calcular desde la fecha de emisión.
- Los **prompts de IA** llevan salvaguardas jurídicas serias: separación de regímenes,
  solo fuentes verificadas del catálogo, prohibición de garantizar resultados, y
  validación humana obligatoria del escrito por un revisor jurídico.
- El **flujo de alta desde documento** tiene control de coherencia con la empresa
  (bloquea si el CIF no coincide), revisión humana campo a campo con niveles de
  confianza, y registro de las correcciones y confirmaciones en el historial.

**Lo que está a medias:**

- **El alta manual de sanciones no funciona** (falta el botón de envío): en la práctica
  solo se puede dar de alta un expediente subiendo un documento.
- Tres tablas diseñadas y nunca usadas: `sanction_outcomes`, `document_access_logs`,
  `integration_endpoints`.
- `sanction_deadlines` se calcula pero el calendario, el dashboard y los listados no
  lo consumen: siguen usando los campos planos de `sanctions`.
- No hay borrado en la UI, ni paginación, ni tests, ni CI.
- Exportación a PDF y comparación de versiones son placeholders.

**Lo que hay que decidir antes de nada:**

1. **Propiedad.** El proyecto es de `jlinares_10`, no de tu cuenta.
2. **Datos.** ¿Se conserva el proyecto Supabase actual (con sus 6 usuarios reales) o se
   parte de un proyecto nuevo con las migraciones y sin la empresa demo?
3. **Proveedor de IA propio**, que sustituya al gateway de Lovable.
4. **Alcance de la especificación**: documentar lo que hay, o redefinir el producto
   aprovechando que el modelo de datos ya prevé cosas que la UI no expone
   (resultados, analítica de estrategias, integraciones).

---

## Anexo A. Inventario de archivos

145 archivos en total:

| Bloque | Archivos | Líneas aprox. |
|---|---:|---:|
| Rutas (`src/routes/`) | 23 | 4.100 |
| Componentes propios (`src/components/*.tsx`) | 4 | 1.244 |
| Componentes shadcn/ui (`src/components/ui/`) | 46 | — (sin modificar) |
| Lógica de negocio (`src/lib/`) | 11 | 2.000 |
| Integración Supabase (`src/integrations/`) | 7 | 1.860 (1.430 son tipos generados) |
| Hooks (`src/hooks/`) | 4 | 430 |
| Migraciones SQL | 17 | 1.132 |
| Configuración raíz | 12 | — |
| Assets | 8 | (6 JPG reales + 2 punteros) |

Archivos generados automáticamente que **no deben editarse a mano**:
`src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`,
`src/integrations/supabase/client.ts`, `client.server.ts`, `auth-attacher.ts`,
`auth-middleware.ts`, `cron-auth.ts`, `previewAuthStorage.ts`.

---

*Documento generado el 7 de septiembre de 2026 a partir del código exportado.
Refleja el estado del proyecto tal como estaba, sin correcciones ni interpretaciones.*
