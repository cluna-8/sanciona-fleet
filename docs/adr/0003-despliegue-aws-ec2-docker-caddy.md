# ADR 0003 — Despliegue en AWS EC2 + Docker + Caddy (v1), no Cloudflare Workers

- **Estado:** aceptado
- **Fecha:** 2026-09-17
- **Contexto:** SPEC.md §7.1–§7.5, ADR 0001, decisión del usuario de desplegar
  en AWS con dominio en Cloudflare y OpenRouter como pasarela de IA.

## Contexto

SPEC §7.4 describía el despliegue como **Workers de Cloudflare** (uno por
servicio, con bindings de servicio para RPC, §7.2). Esa era la opción cuando
el monolito se construía dentro del editor de Lovable, que ya compila a ese
target. Al sacar el proyecto fuera de Lovable y llevarlo a producción, el
usuario pidió explícitamente:

- **AWS** para compute y CI/CD (no Cloudflare para hosting).
- **Cloudflare** solo para el dominio y DNS/TLS edge.
- **OpenRouter** como pasarela de IA (ADR 0001 ya lo cablea vía
  `openai-compatible`).
- Lo más **económico y fácil** de operar, con infra como código en el repo.

Cloudflare Workers quedó descartado por tres razones concretas:

1. **Nitro `cloudflare-module`** es el preset natural de TanStack Start, pero
   los servicios (`deadlines-service`, futuros) y el runtime de IA de
   `@sanciona/ai-provider` (I/O de red a OpenRouter, subida de PDFs) encajan
   mejor en un runtime **Node/Bun** sin límites de CPU/wall-time ni
   restricciones de `fetch` de Workers. El PDF a la IA (bloque multimodal)
   es una capacidad de producto y los Workers imponen fricción real.
2. **Coste y simplicidad de operación**: una sola `t3.small` con Docker
   Compose + Caddy cuesta ~15–25 €/mes y se opera con `docker compose`. Un
   abanico de Workers + Queues + KV + R2 por servicio es más barato solo en
   escala muy baja y exige conocer el modelo de facturación de CF.
3. **Independencia de proveedor de hosting**: el código de los servicios ya
   corre en Bun/Node; desplegarlo en contenedores estándar deja la salida a
   cualquier cloud sin retocar el runtime. Cloudflare queda solo para DNS/TLS,
   donde ya estaba el dominio.

## Decisión

Para **v1** (los primeros clientes), el substrate de despliegue es:

- **AWS EC2** (`t3.small`, región `eu-central-1` Frankfurt — RGPD) con
  **Docker Compose** corriendo `bff-web` + `deadlines-service` en contenedores.
- **Caddy** como reverse proxy en la propia EC2: TLS automático (Let's
  Encrypt), cabeceras de seguridad, límite de 25 MB para subida de documentos.
- **Cloudflare** delante: DNS (registro A proxied a la EIP), TLS Full (strict)
  en el edge, HSTS, min TLS 1.2.
- **ECR** para las imágenes (una por servicio, scan on push).
- **SSM Parameter Store** para los secretos (SecureString); **SSM Run Command**
  para ejecutar el despliegue desde CI sin SSH ni claves estáticas.
- **GitHub Actions → AWS OIDC**: asume un rol por OIDC para build+push a ECR y
  disparar el SSM Run Command. Sin claves de larga duración.
- Todo como código en `infra/aws` (Terraform) y `infra/cloudflare` (Terraform).
- **OpenRouter** como pasarela de IA (ADR 0001, proveedor `openrouter`).

El destino **sigue siendo microservicios** (SPEC §7.1): la EC2 es el
substrate _físico_ común; los servicios se aíslan como contenedores
independientes con su propio Dockerfile, CI y versión, comunicados por HTTP en
la red de Docker. La salida de la EC2 a múltiples EC2 + ALB queda documentada
como **opción v2** cuando la carga lo justifique.

## Consecuencias

**A favor**

- Cumple el requisito del usuario: AWS, Cloudflare para dominio, OpenRouter,
  barato, todo en el repo, documentado.
- Runtime estándar (Bun/Node) sin límites de Workers: el PDF a la IA y el
  análisis largo funcionan sin rodeos.
- Operación simple (`docker compose up -d`); despliegue reproducible desde CI.
- Sin claves estáticas (OIDC + SSM); secretos fuera del repo.
- Portabilidad: el mismo contenedor se ejecuta en cualquier cloud.

**En contra**

- Una sola EC2 es un punto único de fallo (sin HA). Aceptable para v1 con dos
  socios y pocos clientes; no lo es a partir de cierta escala.
- Sin autoescalado ni blue-green nativo. El rollback es redeployar un SHA
  anterior (las imágenes de ECR conservan el historial).
- Caddy en la propia EC2 hace de LB/TLS; si la instancia cae, cae todo.
- El modelo de CF Workers de SPEC §7.2 (bindings de servicio, Queues) no se
  aplica en v1: la comunicación entre servicios es HTTP en la red de Docker.
  Mantener el destino de microservicios (§7.1) pero replantear el mecanismo de
  comunicación en un ADR futuro si se desea event-driven.

## Cambios en la SPEC

- **§7.4** se actualiza para reflejar este ADR: contenedores en EC2 + Caddy +
  ECR + SSM + OIDC, en vez de Workers de Cloudflare.
- **§7.2** se matiza: en v1, RPC directo vía HTTP interno de Docker (no
  bindings de CF). El destino de eventos asíncronos (Queues) queda para una
  fase posterior.
- **ADR 0001** (pendiente de DPA): OpenRouter se confirma como pasarela por
  defecto; el DPA con OpenRouter y el resto de subencargados se trackea en
  `docs/compliance/README.md`.

## Ver también

- `infra/README.md`, `infra/aws/`, `infra/cloudflare/`, `infra/caddy/`
- `docs/deploy/AWS-RUNBOOK.md`, `docs/deploy/DNS-TLS.md`,
  `docs/deploy/CI-CD.md`, `docs/deploy/DATABASE.md`
- `docs/compliance/README.md`
