# deadlines-service en local, vía docker-compose. En producción es un Worker
# de Cloudflare desplegado con `wrangler deploy` (sin Docker); esta imagen
# solo sirve para el stack de prueba local (Etapa 4 del plan de refactor).
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

# `wrangler dev` (workerd) no responde a peticiones HTTP dentro del Docker
# anidado de este entorno (conecta por TCP pero nunca contesta — verificado).
# Para la prueba local se sirve la misma lógica (src/http.ts) sobre Bun; el
# Worker real (src/index.ts, con workerd) es lo que se despliega a
# Cloudflare con `wrangler deploy`, sin pasar por Docker.
CMD ["bun", "run", "src/local-dev-server.ts"]
