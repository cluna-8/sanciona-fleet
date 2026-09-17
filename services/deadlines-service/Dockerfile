# deadlines-service. En producción (AWS, ADR 0003) corre como microservicio Bun
# HTTP usando src/local-dev-server.ts, que reutiliza exactamente la misma lógica
# de negocio (src/http.ts → manejarFetch/calcularPlazos) que el Worker de
# Cloudflare. El nombre `local-dev-server` es histórico: en AWS este runtime ES
# el de producción. El Worker (src/index.ts, con workerd) queda como alternativa
# para despliegue Cloudflare.
FROM oven/bun:1.4-slim AS base
WORKDIR /repo

# bun.lock cubre todo el workspace: hace falta el package.json de cada
# miembro presente en el contexto de build, no solo el que se usa en runtime,
# o `--frozen-lockfile` lo rechaza por no coincidir.
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ai-provider/package.json packages/ai-provider/package.json
COPY services/deadlines-service/package.json services/deadlines-service/package.json
COPY apps/bff-web/package.json apps/bff-web/package.json

RUN bun install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY services/deadlines-service services/deadlines-service

WORKDIR /repo/services/deadlines-service
EXPOSE 8787

# Runtime de producción en AWS: servidor Bun HTTP que reutiliza src/http.ts.
# (Histórico: este archivo nació como shim para docker-compose local porque
# `wrangler dev`/workerd no completaba el handshake HTTP dentro de Docker
# anidado. En AWS es el runtime de producción.)
CMD ["bun", "run", "src/local-dev-server.ts"]
