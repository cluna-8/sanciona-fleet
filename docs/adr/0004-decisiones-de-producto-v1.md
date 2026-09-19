# ADR 0004 — Decisiones de producto para v1 (valores por defecto aplicados)

- **Estado:** aceptado
- **Fecha:** 2026-09-19
- **Decisores:** Cristian Luna y Jorge Linares (socios), con recomendación por
  defecto de la especificación
- **Relacionado:** SPEC.md §2, §3.4, §3.10, §4.1, §4.2, §7.5, §9;
  [[adr-0001-proveedor-de-ia-intercambiable]],
  [[adr-0003-despliegue-aws-ec2-docker-caddy]]

## Contexto

SPEC.md venía con 11 decisiones marcadas 🟡 "pendientes de confirmación por
Cristian y Jorge", cada una con una recomendación por defecto explícita. La
propia SPEC establece la regla (líneas 18–20): *«Si Cristian/Jorge no dicen lo
contrario antes de que esa parte entre en desarrollo, se construye con el valor
por defecto.»* El 19 sep 2026 Cristian delegó: *«toma todas las decisiones
necesarias para terminar el desarrollo.»* Este ADR registra las 11 decisiones
aplicando el valor por defecto de la spec, para que el desarrollo pueda cerrar
sin esperas.

Tres de las decisiones no son firmables por el agente: requieren validación
humana externa (un abogado administrativista, una decisión comercial y un DPA
con el proveedor de IA). Se registran aquí con el valor por defecto aplicado y
su **puerta humana** marcada explícitamente como bloqueante para v1 pública.

## Decisiones

### D-1 — Nombre del rol en la UI (SPEC §2)

Usar **"Revisor jurídico"** en todas partes (UI, mensajes de error, lógica).
Desaparece la etiqueta "Gestor legal".

### D-2 — Modelo multiempresa (SPEC §2)

**Una organización = una empresa** de transporte, sin jerarquía. Una gestoría
que administre varias flotas clientas se modela como varias organizaciones y un
usuario con membresía N:M en todas (el esquema actual ya lo permite). No se
construye un nivel de "cuenta gestoría" en v1.

### D-3 — Validación jurídica del motor de plazos (SPEC §3.4)

**Decisión:** aplicar las reglas de la spec por defecto (20 días naturales para
tráfico, 15 hábiles para transporte, 1 mes para recurso; festivos autonómicos,
locales y móviles además de los 9 nacionales). **Puerta humana bloqueante para
v1 pública:** un abogado administrativista debe confirmar estas reglas antes de
abrir el producto a clientes reales. El motor se construye con el valor por
defecto para poder validarlo, pero **no se libera v1 sin la firma jurídica.**
Ver `docs/compliance/README.md` §2.

### D-4 — Precios y límites por plan (SPEC §3.10)

**Decisión:** mantener los importes vigentes en el código como valores por
defecto — Básico 49 €, Profesional 99 €, Empresa 199 €/mes — con los límites por
plan actuales. **Puerta humana:** confirmarlos o cambiarlos conscientemente
antes de que los vea un cliente (decisión comercial de los socios, no técnica).

### D-5 — Dónde vive la facturación (SPEC §3.10)

Se crea un **`billing-service`** propio, dueño de `organizations.plan` y de la
relación con la pasarela de pago. El correo transaccional va en
`notifications-service` (sin servicio nuevo). `billing-service` se añade al
mapa de servicios de §7.1 y se extrae del monolito en la fase que corresponda
del strangler fig (§7.5). No bloquea v1 funcional; bloquea cobrar de verdad
(RF-ALTA-EMPRESA-5).

### D-6 — Organismos sancionadores (SPEC §4.1)

Separar en dos campos:

1. **Organismo** — campo libre (texto), para cualquier ayuntamiento/provincia.
2. **Régimen sancionador** — selector explícito (Tráfico / Transporte) que el
   usuario confirma o que se sugiere por palabras clave del organismo, pero
   **nunca se infiere en silencio**. El régimen confirmado es lo que alimenta el
   motor de plazos.

### D-7 — Catálogo de categorías de infracción (SPEC §4.1)

Un único catálogo compartido en `fleet.ts`, usado por el alta manual y por la
deducción de la IA. El prompt de extracción se ajusta para devolver solo
valores de esa lista, o `"Otra"` si no encaja. Desaparece el catálogo duplicado
(`CATEGORIAS_INFRACCION`).

### D-8 — Prioridad "Media" (SPEC §4.1)

Recuperar **"Media"** como cuarta opción seleccionable
(`Baja / Media / Alta / Crítica`) y eliminar **"Normal"**, redundante con
"Media". Requiere una migración de datos que reasigne los registros existentes
con `priority = 'Normal'` a `priority = 'Media'`.

### D-9 — Máquina de estados de la sanción (SPEC §4.2)

Adoptar el grafo de transiciones propuesto en SPEC §4.2 como **objetivo**. Para
v1 se implementa como **advertencia blanda**: se permite la transición pero se
avisa si es inusual, sin bloquear (coincide con el alcance v1 de §9). El bloqueo
estricto queda para v2. Cada transición se registra en `sanction_actions` con
estado origen y destino (no el literal "Cambio de estado" actual).

### D-10 — Alcance de la migración a microservicios para v1 (SPEC §7.5)

**Lanzar v1 desde el monolito ya funcional** (`apps/bff-web`) mientras se
extraen `deadlines-service` y `packages/ai-provider` en paralelo (ambos ya
extraídos). La migración completa a microservicios corre como iniciativa de
arquitectura en paralelo, no como bloqueante de v1. El orden de extracción
sigue §7.5: `identity-service` y `fleet-service` a continuación,
`sanctions-service` al final.

### D-11 — Alcance del MVP v1 (SPEC §9)

Se aprueba la propuesta de alcance de §9 tal cual:

- **Entra en v1:** todos los `[NUEVO]` críticos (RF-ALTA-2, RF-FLOTA-2,
  RF-PERF-1/2, RF-PLAZO-3/4, RS-2/RS-3/RS-4, RF-BORRADOR-3), RF-ANALISIS-4
  (proveedor de IA propio, ya hecho vía OpenRouter) y el Bloque 4 legal completo
  antes del primer cliente real.
- **Para v2:** RF-BORRADOR-4/5/6, RF-INF-2, RF-DOC-2 y el bloqueo estricto de
  la máquina de estados.

## Puertas humanas que permanecen (no firmables por el agente)

1. **Validación jurídica del motor de plazos** (D-3) — abogado administrativista.
2. **Confirmación de precios y límites por plan** (D-4) — decisión comercial de
   los socios.
3. **DPA con el proveedor de IA** (OpenRouter) y verificación de no
   entrenamiento con datos de conductores — `docs/compliance/README.md` §1.

Estas tres puertas se marcan como bloqueantes para **v1 pública con clientes
reales**, no para seguir construyendo ni para despliegues internos.

## Consecuencias

- SPEC.md se actualiza: las 11 marcas 🟡 pasan a ✅ apuntando a este ADR.
- `billing-service` entra en el mapa de servicios (§7.1) como décimo tercer
  servicio, con la nota de que no bloquea v1 funcional.
- El desarrollo puede cerrar sin esperas; las puertas humanas quedan
  documentadas en `docs/compliance/README.md` y `TAREAS-CRISTIAN.md`.