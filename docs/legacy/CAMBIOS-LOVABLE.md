# Registro de divergencia con Lovable

Mientras el prototipo siga siendo editable en Lovable, el repo y él divergen.
Este documento registra cada sincronización: qué cambió, qué impacto tiene y qué
hay que revisar.

Para comparar un export nuevo: `./scripts/comparar-lovable.sh <ruta-del-zip>`

---

## 12 de septiembre de 2026

**Origen:** export descargado de Lovable. 151 archivos (antes 145).
**Commits:** `8d2d7b4` (sincronización) + `9198055` (restaura el puente local).
**Periodo cubierto:** 7 → 12 de septiembre.

El proyecto se ha renombrado en Lovable: **"Control de Multas" → "PLATAFORMA SANCIONA"**.

### Qué cambió

| Área | Cambio |
|---|---|
| **Alta en autoservicio** | Nuevo flujo de 3 pasos (`src/lib/alta.functions.ts`, `src/routes/alta.tsx`): datos de contacto y empresa → elección de tarifa → usuario y contraseña generados automáticamente |
| **Tarifas** | `src/lib/planes.ts`: Básico 49 €, Profesional 99 €, Empresa 199 €/mes, con límites de vehículos, conductores y usuarios por plan |
| **Correo transaccional** | `src/lib/email.server.ts`: integración con **Resend** (`RESEND_API_KEY`). Sin configurar todavía |
| **Login** | `src/lib/login.functions.ts`: se puede entrar con nombre de usuario además de con correo |
| **Estructura de rutas** | **La landing comercial desaparece.** `/` pasa a ser login + alta en dos pestañas; `/auth` y `/alta` redirigen a `/` |
| **Esquema** | Migración `20260909080049`: `profiles.username` (con índice único sobre `lower(username)`) y `organizations.plan` |
| **Datos** | Se eliminó una cuenta real y su empresa (`inmacbv@gmail.com`) |

### Impacto en lo ya migrado

**Ninguno.** `src/lib/plazos.ts` y `src/lib/expediente.server.ts` no se han tocado,
así que `deadlines-service` y los prompts de `ai-provider` siguen siendo fieles
al origen. `expediente.functions.ts` solo difería en el puente local a
`deadlines-service`, reaplicado en `9198055`.

### ⚠️ Hallazgos al revisar el código nuevo

El flujo de alta introduce problemas que conviene resolver **antes** de que entre
en la especificación como comportamiento deseado:

1. **Endpoint de alta público y sin frenos.** `crearAlta` no lleva middleware de
   autenticación —correcto, es un alta— pero **crea usuarios y organizaciones con
   la clave `service_role`** sin captcha, sin límite de peticiones y sin
   verificación. Cualquiera puede crear cuentas y empresas en bucle.
2. **`email_confirm: true`.** La cuenta se marca como verificada sin que nadie
   haya probado que el correo es suyo. Combinado con el punto 1, permite crear
   cuentas confirmadas con correos ajenos o inexistentes.
3. **La contraseña viaja al navegador.** `crearAlta` devuelve `password` en
   claro en la respuesta y la UI la muestra en pantalla. Queda en el historial
   del navegador y en cualquier log intermedio.
4. **La contraseña se envía por correo en texto plano.** Lo habitual hoy es
   mandar un enlace de un solo uso para que la persona establezca la suya.
5. **Se elige plan pero no se cobra.** `organizations.plan` se guarda sin
   pasarela de pago: cualquiera puede darse de alta con el plan "Empresa" gratis.
   El propio chat de Lovable deja "Procesar tarifa y crear empresa" como pendiente.
6. **Precios sin decidir por negocio.** Los 49/99/199 € los propuso el modelo, no
   una decisión comercial. En SPEC.md §4 el modelo de negocio sigue marcado como
   decisión pendiente: ahora está resuelto *de facto* en el código.
7. **Nueva dependencia externa: Resend.** No estaba en el inventario ni en la
   spec. Añade otro proveedor al que enviar datos personales.
8. **Enlace roto en el correo.** La plantilla apunta a `${url}/auth`, y `/auth`
   ahora redirige a `/`.
9. **`PUBLIC_SITE_URL` con dominio de Lovable hardcodeado** como valor por
   defecto (`https://sanciona.lovable.app`).

### Qué habría que actualizar en SPEC.md

- **§4 modelo de dominio:** `profiles.username` y `organizations.plan` son nuevos.
- **§4 decisiones pendientes:** el modelo de negocio ha quedado decidido de hecho.
  Confirmarlo o cambiarlo conscientemente.
- **§7 arquitectura:** aparecen dos capacidades que ningún servicio tenía
  asignada — **facturación** y **correo transaccional**. La segunda encaja en
  `notifications-service`; la primera no existe en el mapa de servicios.
- **§3 requisitos:** el alta en autoservicio y el login por usuario son
  requisitos nuevos, sin RF asignado.
