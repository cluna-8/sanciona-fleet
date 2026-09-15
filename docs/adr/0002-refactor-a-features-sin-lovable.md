# ADR 0002 — `apps/bff-web`: refactor a arquitectura modular por features, sin Lovable

- **Estado:** aceptado, ejecutado parcialmente (ver "Consecuencias")
- **Fecha:** 12-15 de septiembre de 2026
- **Contexto:** SPEC.md §7 (microservicios, strangler fig), `docs/refactor/PLAN-REFACTOR-FRONTEND.md`, ADR 0001

## Contexto

El prototipo exportado de Lovable (`multas-export/`) funcionaba de verdad
(sin mock data), pero con deuda que bloqueaba directamente el plan de
microservicios de SPEC.md §7.5:

1. El build dependía de `@lovable.dev/vite-tanstack-config`, un paquete solo
   disponible en el editor de Lovable — el proyecto no compilaba fuera de él.
2. 57 llamadas a `supabase.from(...)` repartidas en 19 archivos, 8 de ellos
   pantallas de UI. El paso 5 del strangler fig ("las rutas dejan de llamar a
   Supabase y pasan a llamar a los servicios") exigía tocar cada una de esas
   pantallas por separado, cada vez que se extrajera un servicio nuevo.
3. 8 archivos de 300 a 760 líneas mezclaban consulta, mutación, validación y
   presentación en la misma función.
4. Cero tests de UI, cero CI, `.env` sin ignorar en git.

## Decisión

Refactor en 4 etapas, ejecutado sobre una copia de trabajo (`apps/bff-web/`)
que deja `multas-export/` como espejo congelado de lo que exporta Lovable:

1. **Cimientos**: `vite.config.ts` explícito sin el paquete de Lovable,
   retirada la telemetría de preview, poda de 37/46 componentes shadcn sin
   uso y 21 paquetes npm huérfanos, CI en GitHub Actions.
2. **Capa de datos por feature**: cada llamada a Supabase se mueve a
   `features/<nombre>/api/client.ts`, uno por servicio objetivo de SPEC.md
   §7.1. Regla de ESLint (`no-restricted-imports`) que impide que una ruta o
   componente vuelva a importar Supabase directamente.
3. **Descomposición**: componentes compartidos (`TarjetaKpi`, `EstadoCarga`,
   `EstadoVacio`) y su adopción donde no cambia el marcado visual generado.
4. **Verificación end-to-end**: `docker-compose` con `bff-web` +
   `deadlines-service`, prueba real (alta de cuenta, login, panel de control)
   contra el proyecto de Supabase real.

## Consecuencias

**A favor**

- Extraer un servicio de negocio (p. ej. `sanctions-service`) ahora significa
  mover un archivo (`features/expedientes/api/client.ts`) y cambiar sus
  llamadas a Supabase por RPC — no tocar 8 pantallas.
- Un cambio de esquema de datos es un error de compilación
  (`@sanciona/contracts`), no un `as never` que falla en producción.
- CI verificable: `bunx tsc --noEmit`, `eslint .`, `bun run build` y
  `bun test` en verde en cada commit de la migración.

**En contra / pendiente**

- **La Etapa 3 (descomposición) quedó parcial a propósito.** Los archivos con
  más riesgo (`lib/expediente.functions.ts`, 760 líneas de lógica con
  consecuencia legal; `alta-documento.tsx`, el wizard de extracción) no se
  tocaron porque el propio plan (§1.6) exige antes una base de regresión
  visual contra un proyecto de Supabase de test, de la que esta sesión no
  disponía credenciales. Descomponerlos sin esa red de seguridad era el
  riesgo que el plan señala explícitamente, no un ahorro de tiempo aceptable.
- **`lib/fleet.ts` y `hooks/use-org.ts` son shims de compatibilidad**, no la
  implementación real, para no tener que tocar ~15 archivos en la misma
  pasada. Se retiran cuando se complete la Etapa 3.
- **`workerd` (el runtime de `wrangler dev`) no respondía a peticiones HTTP
  dentro del Docker anidado del entorno donde se hizo esto** — aceptaba la
  conexión TCP pero nunca contestaba, verificado con una petición HTTP cruda
  por socket. Se separó la lógica HTTP de `deadlines-service` a un módulo sin
  dependencia de `cloudflare:workers` (`http.ts`) para poder servirla también
  con `Bun.serve` en un shim de solo desarrollo local
  (`local-dev-server.ts`). El Worker real que se despliega a Cloudflare
  (`index.ts`) no cambia de comportamiento.
- Ver `docs/spec/06-arquitectura-bff-web.md` §2.5 para el resto de lo
  pendiente.

## Verificación

Stack completo levantado con `docker compose up -d --build`: cálculo real de
plazos contra `deadlines-service`, alta de cuenta real contra el proyecto de
Supabase de producción (`auth.signUp` con la clave pública, sin necesitar
`service_role`), login, panel de control con datos reales y navegación sin
errores de consola. No se creó ningún dato de prueba sin que el administrador
del proyecto (Cristian Luna) lo pidiera explícitamente en la conversación.
