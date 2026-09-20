# SANCIONA FLEET — Especificación funcional (v0.5)

> **v0.5 (20 sep 2026):** RF-BORRADOR-3..6 pasan de [NUEVO] a [EXISTENTE]: la
> exportación de escritos es real (PDF con pdf-lib y .docx con lib docx,
> generados server-side y archivados en Storage con enlace firmado), el diff
> entre versiones es real (lib diff) y "Restaurar y guardar versión" crea una
> versión nueva — `sanction_draft_versions` es append-only. RF-BORRADOR-4/5/6
> se adelantan de v2 a v1 (§9); con ello el hallazgo B-7 del backlog queda
> cubierto por lo que la spec pedía (RF-BORRADOR-6). Hardening de IA en el
> mismo paquete: validación Zod de las server fns de expediente (A-2, mitiga la
> inyección de campos en los prompts) y reintento con backoff y Retry-After +
> cuota diaria por organización con log de uso `ai_usage_logs` (A-3).
>
> **v0.4 (19 sep 2026):** las 11 decisiones pendientes (10 de producto + 1 de
> alcance de migración) se resuelven aplicando sus valores por defecto — ver ADR
> 0004. Quedan tres puertas humanas bloqueantes para v1 pública (validación
> jurídica del motor de plazos, confirmación de precios, DPA con OpenRouter),
> ninguna bloqueante para seguir construyendo.
>
> **v0.3 (12 sep 2026):** incorpora §3.10 — alta en autoservicio, planes, correo
> transaccional y login por usuario, capacidades construidas en Lovable sin pasar
> por esta spec.
>
> **Estado:** completa para desarrollo. Las decisiones de producto están
> resueltas (ADR 0004); las puertas humanas restantes están en
> `docs/compliance/README.md` y `TAREAS-CRISTIAN.md`.
> **Arquitectura:** microservicios (§7) — decisión ya confirmada, no pendiente.
> **Base:** `docs/legacy/INVENTARIO-AS-IS.md` (estado real del código extraído de
> Lovable; antes referenciado como `PROYECTO-MULTAS-INVENTARIO.md`).
> **Método:** spec-driven development (ver `docs/spec/00-metodo.md`). Este
> documento es la fuente de verdad de "qué debe hacer el sistema"; el código se
> construye y se revisa contra él. Toda vez que este documento cambie, se
> versiona (v0.2, v0.3…) y se anota qué cambió y por qué.
>
> **Cómo leer las decisiones:** cada una lleva ✅ **DECIDIDO (ADR 0004)** con el
> valor por defecto aplicado y, si aplica, su puerta humana bloqueante.

---

## 0. Visión y alcance

**Sanciona Fleet** es un SaaS para que empresas españolas de transporte de
mercancías por carretera (flotas de 10 a 100 vehículos) centralicen sus
expedientes sancionadores: reciben la notificación, el sistema extrae los datos
con IA, calcula los plazos legales con un motor determinista, ofrece un análisis
preliminar y ayuda a redactar alegaciones/recursos con validación humana
obligatoria de un revisor jurídico.

**No es** una herramienta de asesoramiento jurídico automatizado: todo análisis
y borrador generado por IA es un apoyo que un humano debe revisar y validar.
Esto debe quedar explícito en el producto (landing, condiciones de uso, y en
cada pantalla donde se muestre contenido generado por IA).

Fuera de alcance de este documento: precios/plan comercial, marketing, soporte
al cliente. Estos se tratan aparte.

---

## 1. Glosario

| Término | Significado |
|---|---|
| **Expediente / Sanción** | Registro central de una multa, desde su recepción hasta su resolución. |
| **Organización / Empresa** | Tenant del sistema. Aísla datos entre clientes (multiempresa). |
| **Régimen sancionador** | Tráfico (DGT, Guardia Civil, ayuntamientos) o Transporte (Ministerio de Transportes, inspección). Determina qué plazos legales aplican. |
| **Extracción** | Resultado de que la IA lea un documento (PDF/imagen) y devuelva los datos estructurados de la sanción. |
| **Análisis** | Evaluación preliminar generada por IA sobre el expediente (semáforo, recomendación, riesgos). |
| **Borrador** | Escrito de alegaciones o recurso, generado por IA y editable, con versiones. |
| **Plazo** | Fecha límite legal para una acción (pago con reducción, alegaciones, identificación del conductor, recurso), calculada por el motor determinista. |
| **Revisor jurídico** | Rol con potestad exclusiva de marcar un borrador como "Validado". |

---

## 2. Actores y roles

| Rol | Alcance | Puede |
|---|---|---|
| **Administrador de empresa** (`admin_empresa`) | Su organización | Todo lo de Gestor + editar datos de empresa, gestionar usuarios y roles, borrar registros. |
| **Gestor de sanciones** (`gestor_sanciones`) | Su organización | Crear/editar sanciones, vehículos, conductores, subir documentos, generar análisis y borradores. |
| **Revisor jurídico** (`revisor_juridico`) | Su organización | Editar y **validar** borradores. No cambia estados de sanción ni da de alta vehículos/conductores. |
| **Superadministrador de plataforma** | Toda la plataforma | Visión global de todas las organizaciones (`/superadmin`), gestión de roles vía `/usuarios`. No edita datos de una empresa concreta. |

✅ **DECIDIDO (ADR 0004, D-1) — nombre del rol en la UI.** Se usa **"Revisor
jurídico"** en todas partes (UI, mensajes de error, lógica). Desaparece la
etiqueta "Gestor legal".

✅ **DECIDIDO (ADR 0004, D-2) — modelo multiempresa.** Una organización = una
empresa de transporte, sin jerarquía. Una gestoría con varias flotas clientas se
modela como varias organizaciones y un usuario con membresía N:M en todas (el
esquema actual ya lo permite). No hay nivel de "cuenta gestoría" en v1.

---

## 3. Requisitos funcionales

Cada requisito tiene un id `RF-<módulo>-<n>` para trazabilidad. Se marca
`[NUEVO]` cuando corrige un hallazgo del inventario, `[EXISTENTE]` cuando ya
funciona así y se mantiene.

### 3.1 Autenticación y alta de empresa

- **RF-AUTH-1** [EXISTENTE] Registro con email + contraseña (8–72 caracteres),
  login, recuperación de contraseña por email.
- **RF-AUTH-2** [EXISTENTE] Al primer acceso sin organización, se crea una
  automáticamente y el usuario queda como `admin_empresa`.
- **RF-AUTH-3** [NUEVO] Las invitaciones a `/usuarios` deben **enviar un email
  real** al invitado con el enlace de alta (hoy no se envía ningún correo:
  inventario §3, "Invitaciones").
- **RF-AUTH-4** [NUEVO] Cambiar la contraseña de cualquier cuenta creada por
  migraciones de Lovable antes de ir a producción propia (hallazgo §8.1 #1).
  Eliminar del historial de migraciones cualquier credencial o email personal
  hardcodeado (§8.1 #1, #2, #3) al reconstruir el esquema en el proyecto Supabase
  propio.

### 3.2 Gestión de flota (vehículos y conductores)

- **RF-FLOTA-1** [EXISTENTE] Alta, edición y listado de vehículos y conductores
  por organización.
- **RF-FLOTA-2** [NUEVO] Debe existir **borrado** (soft-delete, no físico) de
  vehículos, conductores y sanciones desde la UI, respetando las políticas RLS
  ya existentes en base de datos (§8.2 #8). Un registro con expedientes
  asociados no se borra físicamente: se marca inactivo/archivado.
- **RF-FLOTA-3** [EXISTENTE] Estados `activo` / `inactivo` para vehículos y
  conductores.

### 3.3 Alta de expediente

- **RF-ALTA-1** [EXISTENTE] Alta desde documento (PDF/JPG/PNG, máx. 15 MB):
  subida → extracción IA → revisión humana campo a campo → creación.
- **RF-ALTA-2** [NUEVO — crítico] El **alta manual** debe quedar funcional: debe
  existir un botón de envío visible y operativo, y el control de subida de
  archivo debe existir realmente si el formulario lo declara (§8.2 #6, #7). Hoy
  es la única vía de alta que no funciona.
- **RF-ALTA-3** [EXISTENTE] Si el CIF del documento no coincide con el de la
  empresa activa, bloquear la creación hasta confirmación explícita del usuario.
- **RF-ALTA-4** [EXISTENTE] Validación previa a la creación: 7 campos
  obligatorios, importes y fechas coherentes.
- **RF-ALTA-5** [EXISTENTE] Registro en el historial de actuaciones de: alta,
  extracción, correcciones manuales, discrepancias, confirmación expresa.

### 3.4 Motor de plazos

- **RF-PLAZO-1** [EXISTENTE] Determinista, sin IA, basado en `notification_date`
  o `reception_date` (nunca desde `issue_date`). Ver inventario §5.1 para las
  reglas exactas por régimen.
- **RF-PLAZO-2** [EXISTENTE] Si el documento trae fecha límite expresa, prevalece
  sobre el cálculo, pero se contrasta (±1 día = confirmado; más = pendiente de
  verificación con los días de discrepancia).
- **RF-PLAZO-3** [NUEVO] Unificar el cálculo del "plazo relevante": hoy existe
  triplicado (`dashboard.tsx`, `sanciones.index.tsx`, inline en `sanciones.$id.tsx`)
  y las fichas de vehículo/conductor solo miran `payment_deadline` ignorando
  `appeal_deadline` (§8.4 #23). Debe existir **una sola función compartida**.
- **RF-PLAZO-4** [NUEVO] El calendario, el dashboard y los listados deben leer
  de `sanction_deadlines` (con sus estados: Confirmado, Calculado, Pendiente de
  verificación, Vencido, Plazo pendiente de determinar), no de los campos planos
  `payment_deadline`/`appeal_deadline` de `sanctions` (§8.4 #25).
- **RF-PLAZO-5** [NUEVO — legal, bloqueante] Los festivos deben incluir
  autonómicos, locales y móviles, no solo los 9 nacionales fijos actuales
  (§5.1, §8.1 Bloque 4). Requiere decidir fuente de datos (ver §7 Legal).
- ✅ **DECIDIDO (ADR 0004, D-3) — validación jurídica.** Las reglas de plazo
  (20 días naturales tráfico, 15 hábiles transporte, 1 mes recurso) se aplican
  por defecto. **Puerta humana bloqueante para v1 pública:** un abogado
  administrativista debe confirmarlas antes de abrir a clientes reales (ver
  `docs/compliance/README.md` §2). **No se libera v1 sin esta validación.**

### 3.5 Análisis con IA

- **RF-ANALISIS-1** [EXISTENTE] Genera semáforo (verde/naranja/rojo/gris),
  recomendación (una de 7), factores, revisión de procedimiento/prueba,
  incoherencias y fuentes legales citadas del catálogo `legal_sources`.
- **RF-ANALISIS-2** [EXISTENTE] El modelo no calcula plazos, solo los comenta;
  no puede citar normas fuera del catálogo; no puede garantizar resultados.
- **RF-ANALISIS-3** [NUEVO] `recommended_action` se calcula pero no se muestra
  en ninguna pantalla (§8.4 #29): debe mostrarse en la ficha del expediente.
- **RF-ANALISIS-4** [NUEVO] Sustituir el proveedor de IA: cambiar `GATEWAY_URL`
  y la autenticación en `llamarModelo()` (`expediente.server.ts`) del gateway de
  Lovable a un proveedor propio (ver Bloque 2 de tareas). Los tres prompts de
  sistema (extracción, análisis, borrador) se mantienen tal cual — están
  cuidados jurídicamente (§5.5) — solo cambia el transporte HTTP.

### 3.6 Borradores (alegaciones y recursos)

- **RF-BORRADOR-1** [EXISTENTE] Generación con IA, versionado, estructura fija
  del escrito (organismo, expediente, hechos, alegaciones, fundamentos, etc.).
- **RF-BORRADOR-2** [EXISTENTE] Solo `revisor_juridico` puede marcar un
  borrador como "Validado" (aplicado en UI y en la mutación).
- **RF-BORRADOR-3** [EXISTENTE] "Exportar a PDF" genera un PDF real server-side
  (pdf-lib, archivado en Storage con enlace firmado), no abre `window.print()`
  (§8.2 #10). Implementado en v0.5.
- **RF-BORRADOR-4** [EXISTENTE] "Descargar documento editable" produce un
  `.docx` real (lib docx), no HTML con MIME falso de Word (§8.2 #10). Adelantado
  de v2 a v1 e implementado en v0.5.
- **RF-BORRADOR-5** [EXISTENTE] "Comparar versiones" muestra un diff real entre
  la versión seleccionada y la última guardada (§8.2 #11). Adelantado de v2 a
  v1 e implementado en v0.5.
- **RF-BORRADOR-6** [EXISTENTE] "Restaurar y guardar versión" guarda el texto
  de la versión restaurada como versión nueva — `sanction_draft_versions` es
  append-only, nada se destruye (§8.2 #11). Adelantado de v2 a v1 e
  implementado en v0.5.

### 3.7 Documentos

- **RF-DOC-1** [NUEVO] `/documentos` debe permitir subir documentos, no solo
  listarlos (§8.2 #9).
- **RF-DOC-2** [NUEVO] Cada acceso/descarga de un documento debe registrarse en
  `document_access_logs` (la tabla y sus políticas ya existen; falta el punto
  de escritura) (§8.2 #12).

### 3.8 Informes, prevención y avisos

- **RF-INF-1** [EXISTENTE] Indicadores y agrupaciones con export CSV.
- **RF-INF-2** [NUEVO] `sanction_outcomes` (importe evitado, resolución
  favorable, días de resolución) debe empezar a rellenarse cuando un expediente
  se resuelve, para habilitar analítica real de estrategias (§8.2 #13).
- **RF-PREV-1** [EXISTENTE] Recomendaciones preventivas por patrones (categoría
  dominante, vehículo/conductor con ≥2 expedientes).
- **RF-PREV-2** [NUEVO] El agrupado por `municipality` en `/prevencion` debe
  dejar de depender de un campo que solo rellena el alta por IA (§8.4 #30): o se
  captura también en el alta manual, o se excluye del agrupado cuando no exista.

### 3.9 Rendimiento

- **RF-PERF-1** [NUEVO] Paginación server-side en listados de sanciones,
  vehículos y conductores (hoy se carga todo sin `limit`) (§8.4 #31).
- **RF-PERF-2** [NUEVO] Las fichas de vehículo/conductor deben consultar por
  `id`, no cargar la lista completa y buscar en cliente (§8.4 #31).

---

### 3.10 Alta en autoservicio, planes y correo

> **Añadido en v0.3.** Estas capacidades se construyeron directamente en Lovable
> entre el 9 y el 12 de septiembre, **sin pasar por esta especificación**. Se
> recogen aquí para cerrar esa brecha. Ver `docs/legacy/CAMBIOS-LOVABLE.md` y
> el caso de uso CU-07.

- **RF-ALTA-EMPRESA-1** [EXISTENTE] Una empresa puede darse de alta sola, en un
  flujo de tres pasos: datos de contacto y empresa → elección de plan →
  credenciales. Sustituye a la landing comercial, que se eliminó.
- **RF-ALTA-EMPRESA-2** [NUEVO — ⚠️ seguridad] El endpoint de alta es público y
  crea usuarios y organizaciones con la clave `service_role`. Debe protegerse
  con **límite de peticiones y captcha** antes de exponerlo a internet.
- **RF-ALTA-EMPRESA-3** [NUEVO — ⚠️ seguridad] La cuenta no debe marcarse como
  verificada (`email_confirm: true`) sin que se haya probado el correo. El alta
  queda pendiente hasta que se abre el enlace de confirmación.
- **RF-ALTA-EMPRESA-4** [NUEVO — ⚠️ seguridad] La contraseña **no debe viajar al
  navegador ni mostrarse en pantalla**. El correo debe llevar un enlace de un
  solo uso para que la persona establezca la suya, en lugar de una contraseña
  generada en claro.
- **RF-ALTA-EMPRESA-5** [NUEVO — bloqueante comercial] Elegir plan no es
  contratarlo: hoy `organizations.plan` se guarda **sin ningún cobro**.
  Mientras no haya pasarela de pago, cualquiera puede darse de alta con el plan
  más caro gratis.
- **RF-LOGIN-1** [EXISTENTE] Se puede iniciar sesión con nombre de usuario o con
  correo. `profiles.username` es único (índice sobre `lower(username)`).
- **RF-EMAIL-1** [NUEVO] El correo transaccional se envía con **Resend**
  (`RESEND_API_KEY`), pendiente de configurar el dominio. Requiere evaluación
  RGPD como nuevo encargado de tratamiento (Bloque 4 de `TAREAS-CRISTIAN.md`).
- **RF-EMAIL-2** [NUEVO] La plantilla enlaza a `/auth`, que ahora redirige a
  `/`. Debe apuntar a la ruta vigente, y `PUBLIC_SITE_URL` no debe llevar el
  dominio de Lovable como valor por defecto.

✅ **DECIDIDO (ADR 0004, D-4) — precios.** Se mantienen los importes vigentes
como valores por defecto (Básico 49 €, Profesional 99 €, Empresa 199 €/mes) y los
límites por plan actuales. **Puerta humana:** confirmarlos o cambiarlos
conscientemente antes de que los vea un cliente (decisión comercial de los
socios).

✅ **DECIDIDO (ADR 0004, D-5) — dónde vive la facturación.** Se crea un
`billing-service` propio, dueño de `organizations.plan` y de la pasarela de
pago. El correo transaccional va en `notifications-service` (sin servicio
nuevo). `billing-service` se añade al mapa de §7.1 y se extrae en su fase del
strangler fig (§7.5); no bloquea v1 funcional, pero bloquea cobrar de verdad
(RF-ALTA-EMPRESA-5).

## 4. Modelo de dominio objetivo

### 4.1 Catálogos abiertos vs. cerrados

✅ **DECIDIDO (ADR 0004, D-6) — organismos sancionadores.** Se separa en dos
campos:
1. **Organismo** — campo libre (texto), para cualquier ayuntamiento/provincia.
2. **Régimen sancionador** — selector explícito (Tráfico / Transporte) que el
   usuario confirma o que se sugiere por palabras clave del organismo, pero
   **nunca se infiere en silencio**. El régimen confirmado alimenta el motor de
   plazos.

✅ **DECIDIDO (ADR 0004, D-7) — categorías de infracción.** Un único catálogo
compartido en `fleet.ts`, usado por el alta manual y por la deducción de la IA.
El prompt de extracción devuelve solo valores de esa lista, o `"Otra"` si no
encaja. Desaparece el catálogo duplicado `CATEGORIAS_INFRACCION`.

✅ **DECIDIDO (ADR 0004, D-8) — prioridad "Media".** Se recupera **"Media"** como
cuarta opción seleccionable (`Baja / Media / Alta / Crítica`) y se elimina
**"Normal"**, redundante con "Media". Requiere una migración de datos que
reasigne los registros existentes con `priority = 'Normal'` a `priority =
'Media'`.

### 4.2 Máquina de estados de la sanción

✅ **DECIDIDO (ADR 0004, D-9) — transiciones válidas.** Se adopta el grafo de
transiciones siguiente como objetivo. Para v1 se implementa como
**advertencia blanda**: se permite la transición pero se avisa si es inusual,
sin bloquear (alcance v1 de §9). El bloqueo estricto queda para v2.

```
Nueva ──► Pendiente de documentación
Nueva ──► Pendiente de identificación del conductor
Nueva / Pendiente de documentación / Pendiente de identificación
    ──► Pendiente de revisión
Pendiente de revisión ──► Pagar con descuento
Pendiente de revisión ──► Preparar alegaciones
Preparar alegaciones ──► Alegaciones presentadas
Alegaciones presentadas ──► Recurso presentado
Alegaciones presentadas / Recurso presentado
    ──► Resuelta favorablemente | Resuelta desfavorablemente
Pagar con descuento ──► Pagada
Resuelta desfavorablemente ──► Pagada
Cualquier estado ──► Archivada   (solo admin_empresa)
```

Cada transición debe quedar registrada en `sanction_actions` con el estado
origen y destino (hoy solo se guarda un literal "Cambio de estado" sin ese
detalle explícito — §8.4 #24, `TIPOS_ACTUACION` definido pero sin usar).

---

## 5. Seguridad y permisos

- **RS-1** [EXISTENTE, mantener] RLS activo en las 22 tablas; funciones
  `SECURITY DEFINER` con privilegios revocados de `PUBLIC`/`anon`.
- **RS-2** [NUEVO] `/sanciones/$id` debe filtrar explícitamente por
  `organization_id` en sus cuatro consultas, en vez de depender solo de RLS
  como única capa de defensa (§8.1 #5).
- **RS-3** [NUEVO] Antes de subir el esquema a un repositorio: eliminar o
  neutralizar cualquier migración con credenciales, emails o UUIDs personales
  hardcodeados (§8.1 #1, #2, #3). Los superadministradores de plataforma deben
  gestionarse desde una pantalla o script parametrizado, no desde una migración
  fija.
- **RS-4** [NUEVO] `.env` debe entrar en `.gitignore`; se publica un
  `.env.example` con las claves necesarias sin valores reales (§8.1 #4).
- **RS-5** [EXISTENTE, confirmar] Tablas append-only (`sanction_actions`,
  `sanction_draft_versions`, `document_access_logs`) mantienen sus políticas de
  bloqueo de `UPDATE`/`DELETE`.

---

## 6. Requisitos no funcionales

| Área | Requisito |
|---|---|
| **Hosting** | SSR obligatorio (TanStack Start + Nitro). Cloudflare Workers como target por defecto; alternativa Vercel/Netlify con adaptador SSR. Un sitio estático **no sirve**. |
| **Entornos** | dev / staging / producción, como proyectos Supabase separados (ver Bloque 2 de tareas). |
| **Auditoría** | `activity_logs` y `document_access_logs` deben usarse realmente (RF-DOC-2). |
| **Disponibilidad de IA** | El sistema debe degradar con gracia si el proveedor de IA falla o no hay créditos: mensaje claro, posibilidad de continuar con alta manual (una vez RF-ALTA-2 esté resuelto). |
| **Internacionalización** | Fuera de alcance v1: el producto es solo para España (normativa, festivos, idioma). |
| **Accesibilidad** | Mínimo: componentes shadcn/ui (ya basados en Radix, accesibles por defecto) — no se rediseñan por accesibilidad en v1 salvo que se detecte un bloqueador concreto. |

---

## 7. Arquitectura de microservicios (target)

🔧 **Decisión de arquitectura confirmada por Cristian:** el sistema se construye
como **microservicios**, no como el monolito TanStack Start heredado de Lovable.
El código exportado (`multas-export/`) se trata como el **prototipo de
referencia** de la lógica de negocio (motor de plazos, prompts de IA, reglas de
validación) — esa lógica se conserva y se traslada, pero la forma de desplegarla
cambia.

### 7.1 Principio de descomposición

Se separa por **capacidad de negocio**, no por capa técnica. Cada servicio es
dueño de sus tablas y nadie más las toca directamente.

| Servicio | Responsabilidad | Tablas que posee | Sustituye/cubre del inventario |
|---|---|---|---|
| **bff-web** | Front-end (la app TanStack Start actual, reducida a UI + orquestación). No contiene lógica de negocio propia; llama al resto de servicios. | ninguna | Todas las rutas `src/routes/` |
| **identity-service** | Autenticación (delegada a Supabase Auth), organizaciones, membresías, roles, invitaciones, superadmins | `organizations`, `organization_members`, `organization_invitations`, `profiles`, `platform_admins` | RF-AUTH-*, `use-org.ts`, `ensure_active_organization` |
| **fleet-service** | Vehículos y conductores | `vehicles`, `drivers` | RF-FLOTA-* |
| **sanctions-service** | Núcleo del expediente: alta, edición, estados, historial | `sanctions`, `sanction_actions`, `sanction_comments` | RF-ALTA-*, máquina de estados (§4.2) |
| **extraction-service** | Sube el documento, llama al proveedor de IA para extraer datos, cruza con flota | `sanction_documents`, `sanction_extractions` | RF-ALTA-1, `expediente.server.ts` (extracción) |
| **deadlines-service** | Motor de plazos determinista (sin IA) | `sanction_deadlines` | RF-PLAZO-* — candidato ideal a aislar primero: es lógica pura, crítica legalmente y sin dependencias externas |
| **analysis-service** | Análisis preliminar con IA (semáforo, recomendación) | `sanction_analyses` | RF-ANALISIS-* |
| **drafts-service** | Generación y versionado de escritos (alegaciones/recursos), flujo de validación jurídica | `sanction_drafts`, `sanction_draft_versions` | RF-BORRADOR-* |
| **documents-service** | Gestión del bucket de Storage, control de acceso, auditoría de descargas | Storage `sanction-documents`, `document_access_logs` | RF-DOC-* |
| **notifications-service** | Avisos internos, y a futuro email real de invitaciones/alertas | `notifications` | RF-AUTH-3 |
| **reporting-service** | Informes, prevención, analítica de resultados | `activity_logs`, `sanction_outcomes`, lecturas agregadas de `sanctions` | RF-INF-*, RF-PREV-* |
| **legal-catalog-service** | Catálogo jurídico (`legal_sources`), solo lectura para el resto, solo escritura por un proceso interno controlado | `legal_sources` | §6.6 del inventario |
| **billing-service** | Planes, cobros y suscripciones; relación con la pasarela de pago (ADR 0004, D-5). No bloquea v1 funcional; bloquea cobrar de verdad. | `organizations.plan` (migración de propiedad desde `identity`) | RF-ALTA-EMPRESA-5 |

`ai-gateway` no es un servicio de negocio: es una **librería/cliente
compartido** (`packages/ai-provider`) que `extraction-service`,
`analysis-service` y `drafts-service` importan, con una interfaz única
(`extraer()`, `analizar()`, `redactar()`) por detrás de la cual se cambia de
proveedor de IA sin tocar los tres servicios (cubre RF-ANALISIS-4).

### 7.2 Comunicación entre servicios

> **Matización (ADR 0003):** el substrate v1 es AWS EC2 + Docker, no Cloudflare
> Workers. Lo que sigue es el **destino** de microservicios; en v1, el RPC
> directo es **HTTP interno** entre contenedores en la red de Docker y los
> eventos asíncronos quedan para una fase posterior. Replantear el mecanismo
> concreto en un ADR futuro si se desea event-driven.

- **Cloudflare Workers con bindings de servicio (RPC directo)** para llamadas
  síncronas del `bff-web` a cada servicio — sin pasar por HTTP público, ya que
  todos corren en la misma cuenta de Cloudflare. Es el patrón de menor fricción
  dado que Nitro ya compila a ese target.
- **Eventos asíncronos (Cloudflare Queues)** para lo que no necesita respuesta
  inmediata y hoy está "cosido a mano" en el monolito:
  - `expediente.creado` → dispara `deadlines-service` (calcular plazos) y
    `notifications-service` (avisar).
  - `documento.extraido` → dispara sugerencia de `analysis-service`.
  - `borrador.validado` → dispara `notifications-service` y
    `reporting-service` (analítica).
- **Contrato explícito por servicio:** cada uno publica sus tipos de
  entrada/salida en un paquete compartido (`packages/contracts`, TypeScript),
  para que un cambio de forma de datos sea un error de compilación, no un bug
  en producción.

### 7.3 Datos: un Postgres, esquemas separados (no DB-per-servicio todavía)

Con dos socios y sin equipo de plataforma dedicado, **DB-per-servicio físico es
sobre-ingeniería en v1**. Se recomienda:

- **Un único proyecto Supabase**, pero **un esquema de Postgres por servicio**
  (`identity.*`, `fleet.*`, `sanctions.*`, `deadlines.*`, etc.) en vez del
  esquema `public` único actual.
- Ningún servicio hace `JOIN` cruzando esquemas de otro servicio: si
  `sanctions-service` necesita el nombre del conductor, se lo pide a
  `fleet-service` (RPC), no consulta su tabla directamente. Esto es lo que
  realmente hace que sean microservicios y no "una base de datos con carpetas".
- RLS se mantiene igual de estricto, ahora por esquema.
- Migrar a proyectos Supabase separados por servicio queda como **opción v2**
  si el equipo crece o si algún servicio necesita escalar o aislarse por
  cumplimiento de forma independiente.

### 7.4 Repositorio y despliegue

- **Monorepo** (Bun workspaces) dentro de la GitHub Organization compartida:
  `apps/bff-web`, `services/identity-service`, `services/fleet-service`, …,
  `packages/contracts`, `packages/ai-provider`.
- **Substrate v1: AWS EC2 + Docker + Caddy** (ADR 0003). Cada servicio es un
  **contenedor independiente** con su propio `Dockerfile`, pipeline de CI y
  versión — se despliega solo, sin redeployar el resto. Las imágenes viven en
  **ECR** (una por servicio, scan on push); los secretos en **SSM Parameter
  Store**; el despliegue se dispara por **SSM Run Command** desde GitHub Actions
  vía **AWS OIDC** (sin claves estáticas). DNS y TLS edge en **Cloudflare**
  (registro A proxied a la EIP, TLS Full strict); Caddy en la EC2 termina TLS
  al origen. Todo como código en `infra/aws` y `infra/cloudflare` (Terraform).
- El destino sigue siendo **microservicios** (§7.1): la EC2 es el substrate
  físico común; la comunicación entre servicios es HTTP en la red de Docker.
  La salida a múltiples EC2 + ALB, y a eventos asíncronos, queda como **opción
  v2** (replantear el mecanismo de §7.2 en un ADR futuro).
- `deadlines-service`, por ser lógica pura, lleva su **propia suite de tests
  unitarios exhaustiva** (hoy el proyecto no tiene ningún test, §8.4 #34) y
  changelog propio, dado que cualquier cambio ahí tiene consecuencia legal
  directa.

### 7.5 Estrategia de migración (strangler fig, no reescritura de golpe)

El monolito ya funciona en local (ver sesión anterior). No se reescribe de una
vez; se extrae un servicio a la vez mientras el resto sigue sirviéndose desde
el monolito:

1. **`deadlines-service` primero.** Es lógica pura (`plazos.ts`), sin IA, la
   pieza más definida y la de mayor riesgo legal si queda mal aislada. Extraerla
   ya obliga a definir el contrato `packages/contracts` que usarán los demás.
2. **`packages/ai-provider`** — se construye al sustituir `LOVABLE_API_KEY`
   (bloqueador #1 del inventario), ya con la interfaz que usarán
   `extraction-service`, `analysis-service` y `drafts-service`.
3. **`identity-service` y `fleet-service`** — capacidades más aisladas y con
   menos acoplamiento cruzado.
4. **`sanctions-service`** al final — es el núcleo con más dependencias
   entrantes (casi todos los demás servicios lo referencian).
5. `bff-web` se queda siendo el TanStack Start actual, pero sus rutas dejan de
   llamar a `supabase.from(...)` directamente y pasan a llamar a los servicios.

✅ **DECIDIDO (ADR 0004, D-10) — alcance de la migración para v1.** Se lanza v1
desde el monolito ya funcional (`apps/bff-web`) mientras se extraen
`deadlines-service` y `packages/ai-provider` en paralelo (ambos ya extraídos).
La migración completa a microservicios corre como iniciativa de arquitectura en
paralelo, no como bloqueante de v1. Orden de extracción según §7.5:
`identity-service` y `fleet-service` a continuación, `sanctions-service` al
final.



Esto no es una recomendación con opción por defecto: son condiciones para
poder operar con clientes reales. Ver Bloque 4 de `TAREAS-CRISTIAN.md`.

1. **Validación jurídica del motor de plazos** por un abogado administrativista
   antes de v1 pública (RF-PLAZO-5 y reglas de §5.1).
2. **RGPD:** registro de actividades de tratamiento, política de privacidad,
   base legal, plazos de conservación, y **contrato de encargado de tratamiento**
   con el proveedor de IA elegido (se le envían documentos con datos de
   conductores). Verificar que el proveedor no entrena modelos con esos datos.
3. **Condiciones de uso** formalizando que el análisis de IA es preliminar y no
   constituye asesoramiento jurídico.
4. **Política de retención** de documentos en Storage y procedimiento de
   derecho de supresión.
5. **Revisión jurídica de los tres prompts de sistema** (extracción, análisis,
   borrador) y del texto de descargo de responsabilidad visible al usuario.

---

## 9. Alcance del MVP (v1)

✅ **DECIDIDO (ADR 0004, D-11) — alcance final.** Mínimo viable aprobado:

**Entra en v1:**
- Todos los `[NUEVO]` marcados como crítico: RF-ALTA-2 (alta manual funcional),
  RF-FLOTA-2 (borrado), RF-PERF-1/2 (paginación), RF-PLAZO-3/4 (plazos
  unificados), RS-2/RS-3/RS-4 (seguridad), RF-BORRADOR-3 (PDF real).
- RF-BORRADOR-4/5/6 (docx real, diff de versiones, restaurar-y-guardar) —
  adelantados de v2 a v1 en v0.5: la exportación es parte del flujo "generar
  y enviar" y un escrito que no se puede entregar rompe el caso de uso.
- RF-ANALISIS-4 (proveedor de IA propio) — sin esto no hay producto.
- Bloque 4 completo (legal) antes del primer cliente real, no antes del primer
  despliegue técnico.

**Se queda para v2 (backlog explícito):**
- RF-INF-2 (`sanction_outcomes` / analítica de estrategias).
- RF-DOC-2 (log de accesos a documentos) si no es requisito legal inmediato.
- Máquina de estados completa (§4.2) puede empezar como advertencia blanda
  (permitir la transición pero avisar si es inusual) antes de bloquear
  transiciones por completo.

---

## 10. Trazabilidad

Cada RF de este documento referencia la sección del inventario de la que nace
(`§n` = sección de `docs/legacy/INVENTARIO-AS-IS.md`). Cuando se implemente un
RF, el commit/PR correspondiente debe citar su id (`RF-ALTA-2`, `RS-3`, etc.)
para poder rastrear qué parte de la spec quedó cubierta y cuál no.

---

## 11. Próximos pasos

1. ~~Cristian y Jorge revisan las decisiones pendientes~~ — resueltas en ADR 0004
   (19 sep 2026). Quedan tres puertas humanas bloqueantes para v1 pública:
   validación jurídica del motor de plazos, confirmación de precios y DPA con
   OpenRouter (ver `docs/compliance/README.md`).
2. Con las decisiones resueltas, este documento pasa a v1.0 (ya no borrador) en
   cuanto las tres puertas humanas se firmen, y se convierte en la referencia
   para escribir historias de usuario / tickets por módulo.
3. En paralelo, Bloques 0–2 de `TAREAS-CRISTIAN.md` (seguridad, cuentas de
   organización compartidas, infraestructura) deben ir avanzando — no bloquean
   escribir código, pero sí bloquean desplegar nada real.
