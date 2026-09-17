# Compliance y legal — Sanciona Fleet

Track de cumplimiento normativo (RGPD / LOPDGDD) y validación jurídica del motor
de plazos. Este archivo es el **registro vivo** de qué hay hecho, qué falta y
quién lo firma. No es un documento legal; es la trazabilidad para que
abogado/asesor pueda auditar.

Ver ADR 0001 (Supabase managed) y ADR 0003 (AWS).

## Estado actual (2026-09-17)

| Bloque                                            | Estado                         | Bloqueante v1                        |
| ------------------------------------------------- | ------------------------------ | ------------------------------------ |
| Encargados de tratamiento (DPA)                   | ⚠️ Borrador, sin firmar        | Sí                                   |
| Validación jurídica del motor de plazos           | ⚠️ Pendiente                   | Sí                                   |
| RGPD: base jurídica, RIA, registro de actividades | ⚠️ Pendiente                   | No (pero antes de lanzar a clientes) |
| Revisión de prompts de IA (extracción/análisis)   | ⚠️ Pendiente                   | No                                   |
| Calendario de festivos (RF-PLAZO-5)               | ⚠️ Pendiente                   | Sí (plazos)                          |
| Seguridad: RLS, secretos, TLS                     | ✅ Implementado                | —                                    |
| Residencia de datos (EU)                          | ✅ AWS Frankfurt + Supabase EU | —                                    |

---

## 1. Encargados de tratamiento (DPA)

Sanciona Fleet actúa como **responsable** del tratamiento de los datos de
sanciones de sus clientes (empresas de flotas). Los subencargados son:

| Subencargado                 | Qué trata                                                           | Ubicación                                    | DPA necesario                                         | Estado                |
| ---------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | --------------------- |
| **Supabase** (proyecto prod) | BD Postgres, Auth, Storage de documentos sancionadores              | EU (Frankfurt)                               | Sí                                                    | ⚠️ Borrador           |
| **OpenRouter**               | Texto/imagen de las sanciones enviados a IA (extracción + análisis) | Ver política OpenRouter; modelos de terceros | Sí                                                    | ⚠️ Pendiente          |
| **AWS** (EC2 Frankfurt)      | Hosting del bff-web + deadlines-service, logs, ECR                  | EU (Frankfurt)                               | Sí (DPA estándar AWS)                                 | ⚠️ Firmar addendum    |
| **Cloudflare**               | DNS + proxy + TLS edge; logs de edge                                | Global (ver DPA Cloudflare)                  | Sí                                                    | ⚠️ Firmar addendum    |
| **GitHub**                   | Código fuente, Actions logs                                         | US                                           | No aplica a datos de clientes (no hay PII en el repo) | ✅                    |
| **Resend**                   | Correo transaccional (invitaciones)                                 | Ver política                                 | Sí si se activa                                       | ⚠️ Sin configurar aún |

**Acciones** (Cristian / Jorge):

1. Firmar/aceptar el DPA de Supabase desde el panel de la organización (es
   gratis, auto-servicio en supabase.com → Settings → Legal).
2. Aceptar el DPA de OpenRouter (ver openrouter.ai/legal). **Riesgo**: OpenRouter
   enruta a modelos de terceros (Anthropic, Google, OpenAI...); confirmar que
   su cláusula de no-entrenamiento cubre los proveedores subyacentes.
3. AWS Customer Agreement + DPA addendum (console.aws.amazon.com → Account →
   Data Processing).
4. Cloudflare DPA (dash.cloudflare.com → Preferences).
5. Guardar PDFs de los DPA firmados en el repositorio de legal (fuera del
   repo de código) y referenciarlos aquí.

### Datos enviados a la IA (OpenRouter)

Se envían al modelo: **el texto extraído del documento sancionador** (notificación,
aleaciones) y, si el modelo lo soporta, la **imagen/PDF** del propio documento.
Esto puede incluir datos personales del conductor (nombre, DNI, matrícula,
infracción). Por eso:

- Base jurídica: **interés legítimo** del responsable para gestionar la
  sanción (art. 6.1.f RGPD). Documentar la balanza de intereses en el RIA.
- Proveedor comprometido a **no entrenar** con los inputs (verificar cláusula
  OpenRouter + del modelo elegido). Si el modelo no lo garantiza, descartarlo.
- Minimización: **no** enviar metadatos innecesarios. El prompt va sin datos
  del cliente (la empresa), solo el contenido del documento.
- Logging: el backend **no** guarda el contenido devuelto por la IA más allá
  del borrador generado (ver `expediente.server.ts`). Revisar que no haya
  logs en claro con el contenido completo.

---

## 2. Validación jurídica del motor de plazos

El motor de plazos (`services/deadlines-service`, `plazos.test.ts`) tiene
**consecuencia legal directa**: un plazo mal calculado puede caducar el
derecho a alegar/recurrir. Por eso:

- Bloqueante v1: **un abogado valida** las reglas de cálculo (días hábiles vs
  naturales, cómputo desde notificación, suspensión por alegaciones, recursos).
- Las reglas están en `plazos.test.ts` como **casos de test**: cada caso es
  un ejemplo concreto (fecha de notificación → fecha límite). El abogado
  revisa esos casos uno a uno y firma que el resultado es correcto.
- Pendiente: **festivos** (RF-PLAZO-5). El motor hoy no conoce festivos
  autonómicos ni locales. Hasta que se cargue un calendario festivo por
  CA/provincia, los plazos son **orientativos** y debe mostrarse aviso al
  usuario. Ver `docs/spec/05-trazabilidad.md` (Bloqueante v1).

**Acciones**:

1. Listar las reglas implementadas (extraer de `plazos.test.ts`) a un
   documento revisable por el abogado. (TODO: generar
   `docs/compliance/REGLAS-PLAZOS.md` desde los tests.)
2. Firma del abogado sobre los casos de test.
3. Decidir fuente del calendario de festivos (API del Ministerio / BOE /
   proveedor) y cargarlo. Documentar la fuente y su actualización.

---

## 3. RGPD / LOPDGDD

| Obligación                                                   | Estado                                                       | Dónde                             |
| ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------- |
| Registro de Actividades de Tratamiento (RIA)                 | ⚠️ Borrador aquí abajo                                       | esta sección                      |
| Base jurídica por tratamiento                                | ⚠ Pendiente                                                  | RIA                               |
| Consentimiento / información al interesado                   | ⚠ Pendiente (privacy policy + avisos)                        | docs/compliance/PRIVACY.md (TODO) |
| Derechos ARCO+ (acceso, rectificación, supresión, oposición) | ⚠ Sin flujo en la app                                        | TODO                              |
| Notificación de brechas (72 h AEPD)                          | ⚠ Sin runbook                                                | TODO: docs/compliance/BRECHES.md  |
| Encargados (DPA)                                             | ⚠ Ver §1                                                     | §1                                |
| Transferencias internacionales                               | ⚠ OpenRouter/CF/GitHub                                       | §1                                |
| Medidas de seguridad (art. 32)                               | ✅ TLS, RLS, secretos en SSM, OIDC                           | infra/ + ADR 0003                 |
| DPIA (Evaluación de impacto)                                 | ⚠ Recomendada (tratamiento de infracciones, datos sensibles) | TODO                              |

### RIA (bordeador)

| Tratamiento                   | Finalidad                                      | Base jurídica                 | Datos                                                  | Destinatarios             | Retención                                    |
| ----------------------------- | ---------------------------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------- | -------------------------------------------- |
| Gestión de sanciones de flota | Defender/alegar/recurrir sanciones de clientes | Interés legítimo (art. 6.1.f) | Datos del conductor, matrícula, infracción, documentos | Supabase, AWS, OpenRouter | Mientras dure el expediente + plazos legales |
| Alta de empresas y usuarios   | Gestión de cuenta                              | Contrato (art. 6.1.b)         | CIF, contacto, email                                   | Supabase, Resend          | Vigencia de la cuenta                        |
| Invitaciones por correo       | Onboarding                                     | Consentimiento / contrato     | Email                                                  | Resend                    | Hasta aceptar o caducar                      |

> Este RIA es un borrador. Cristian/Jorge deben revisarlo y completarlo con
> el asesor jurídico antes de lanzar a clientes reales.

---

## 4. Revisión de prompts de IA

Los prompts viven en `apps/bff-web/src/lib/expediente.server.ts` (constantes
`SISTEMA_*`) y en `@sanciona/ai-provider`. Son instrucciones de sistema que
definen qué extrae y cómo analiza/redacta la IA.

**Riesgos a revisar**:

- Que el prompt no instruya a la IA a **inventar** datos no presentes en el
  documento (alucinación jurídica).
- Que el **análisis** (recomendación de acción) no sustituya el criterio del
  abogado: debe presentarse como sugerencia, no como dictamen.
- Que no se pidan a la IA datos personales **innecesarios** más allá del
  documento.
- Cumplimiento de la cláusula del proveedor sobre outputs.

**Acciones**:

1. Revisión humana de los prompts (Cristian + abogado) antes de prod.
2. Añadir a los prompts una instrucción explícita de **no inventar** y de
   **marcar incertidumbre** (ya parcialmente en `SISTEMA_*`; auditar).
3. Log de versiones de prompt (commit hash) junto al output, para
   trazabilidad de qué prompt generó cada borrador. (TODO en
   `expediente.server.ts`: incluir el hash del prompt en el metadato del
   borrador.)

---

## 5. Seguridad (art. 32 RGPD)

- **TLS** 1.2+ edge (Cloudflare) y origen (Caddy/Let's Encrypt). HSTS. Ver
  `docs/deploy/DNS-TLS.md`.
- **RLS** en todas las tablas de negocio; service role key solo en backend.
  Ver `docs/deploy/DATABASE.md`.
- **Secretos** en AWS SSM Parameter Store (SecureString), nunca en el repo.
  OIDC GitHub→AWS sin claves estáticas. Ver `docs/deploy/CI-CD.md`.
- **Logs**: revisar que no registren contenido de documentos ni claves.
  (Auditar `expediente.server.ts` y Caddy access logs.)
- **Backups**: a cargo de Supabase. Definir RPO/RTO con el asesor.

Pendiente de seguridad (no bloqueantes v1, sí antes de clientes):

- RS-2: `/sanciones/$id` sin filtro por organización (ver trazabilidad).
- RS-3: migración con contraseña en claro.
- Endpoint público de alta de empresa con `service_role`, sin captcha/limite
  (ver `docs/legacy/CAMBIOS-LOVABLE.md`).

---

## Próximos pasos (orden)

1. **Firmar DPA Supabase + AWS + Cloudflare + OpenRouter** (Cristian).
2. **Validación jurídica del motor de plazos** + calendario de festivos.
3. Completar **RIA** y **privacy policy** con asesor.
4. Revisión de **prompts** + log de versión de prompt.
5. Runbook de **brechas** + flujo de **derechos ARCO+**.
6. Cerrar RS-2, RS-3 y el endpoint público de alta.
