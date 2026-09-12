# Runbook: llevar el stack local a Elea

> **Estado:** el stack de `docker-compose.yml` está construido y verificado
> en local (ver §3). Esta sesión **no tiene acceso a la VPN ni SSH del
> servidor de Elea**, así que los pasos 4 en adelante son instrucciones para
> ejecutar manualmente — no se han corrido aquí. Ver §5 para lo que falta
> antes de tener clientes reales.

## 1. Qué se lleva

El repo completo (es público según se indicó, así que clonarlo dentro de la
VPN de Elea no debería pedir credenciales):

```
apps/bff-web              Frontend (Dockerfile de prueba local incluido)
services/deadlines-service Motor de plazos (Dockerfile de prueba local incluido)
packages/contracts, packages/ai-provider
docker-compose.yml         Stack de prueba local
```

## 2. Lo que NO se lleva tal cual

Los `Dockerfile` de `apps/bff-web` y `services/deadlines-service` están
pensados para **verificar en local con `docker-compose`**, no para
producción:

- `bff-web` corre en modo `vite dev` (SSR de desarrollo), no el build de
  producción. El build real usa el preset Nitro `cloudflare-module` y está
  pensado para desplegarse como **Cloudflare Worker** (`wrangler deploy`),
  no como contenedor Node/Bun de larga duración.
- `deadlines-service` corre un shim sobre Bun (`local-dev-server.ts`) en vez
  de `wrangler dev`, porque `workerd` no completaba el handshake HTTP dentro
  del Docker anidado de este entorno de desarrollo (ver nota en el propio
  `Dockerfile` del servicio). El Worker real (`src/index.ts`) es el que se
  despliega a Cloudflare y no tiene ese problema fuera de este sandbox.

**Antes de decidir cómo se despliega en Elea, hay una pregunta de
arquitectura pendiente**: ¿Elea es un servidor Cloudflare-adjacent (con
`wrangler deploy` hablando contra la cuenta de Cloudflare) o es un servidor
Docker genérico donde el stack debe correr contenerizado de forma
permanente? SPEC.md §7.4 asume Cloudflare Workers. Si Elea es Docker puro,
hace falta un tercer Dockerfile de producción para `bff-web` (build real +
`nitro/node` preset o `vite preview`, no `vite dev`) — no confundir con el
de prueba local de este commit.

## 3. Verificación ya hecha en local (esta sesión)

```sh
docker compose up -d --build
```

- `deadlines-service`: contenedor sano (`healthy`), responde en
  `GET /health` y calcula plazos reales en `POST /calcular` (verificado con
  una petición real, respuesta con dos plazos calculados).
- `bff-web`: sirve SSR real en `http://localhost:8080` — captura de pantalla
  de la pantalla de acceso, con el diseño original intacto, y la pestaña
  "Darse de alta" cambiando de paso correctamente (hidratación de React
  funcionando). Sin errores en consola.
- `bff-web` → `deadlines-service`: verificado que `bff-web` resuelve
  `http://deadlines-service:8787` por el nombre del servicio de Docker
  Compose y recibe `200 OK` de `/health`.

**Lo que esta verificación NO cubre** (requiere credenciales que esta sesión
no tiene): iniciar sesión con una cuenta real, crear un expediente, subir un
documento y ver la extracción por IA. El proyecto de Supabase es el mismo de
producción (propiedad de `jlinares_10` según el inventario, no de Cristian),
así que no se ha intentado crear ninguna cuenta de prueba contra él sin
autorización explícita — ver §5.

## 4. Pasos para Elea (a ejecutar manualmente, dentro de la VPN)

```sh
git clone <url-del-repo> sanciona-fleet
cd sanciona-fleet
cp apps/bff-web/.env.example apps/bff-web/.env
# Rellenar apps/bff-web/.env con las credenciales reales de Supabase
# (las mismas que usa hoy Lovable — pedírselas a quien las tenga, ver
# docs/legacy/INVENTARIO-AS-IS.md §0: el proyecto es de jlinares_10).
docker compose up -d --build
```

Si Elea es Docker puro (no Cloudflare), sustituir el `CMD` del `Dockerfile`
de `bff-web` por el build de producción antes de considerarlo listo para
tráfico real — el modo `vite dev` actual no es apto para producción (recarga
en caliente activa, sin optimizaciones de build).

## 5. Antes de que esto sirva a un cliente real

Esto **no** sustituye nada de `TAREAS-CRISTIAN.md` ni de SPEC.md §8
(bloqueadores legales/RGPD) ni §9 (alcance del MVP). En concreto, antes de
apuntar Elea a tráfico real:

1. Confirmar con Jorge (`jlinares_10`) el traspaso o uso compartido del
   proyecto Supabase — hoy no es propiedad de Cristian.
2. Decidir si Elea despliega esto como Cloudflare Worker (como asume
   SPEC.md §7.4) o como Docker permanente — cambia el Dockerfile de
   producción de `bff-web` que este runbook no ha escrito porque esa
   decisión no está tomada.
3. `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`/`IA_PROVEEDOR`, y las
   credenciales de Resend (correo transaccional) no están en este runbook a
   propósito: son secretos de producción y no deben pasar por un archivo en
   texto plano del repo ni por este documento.
