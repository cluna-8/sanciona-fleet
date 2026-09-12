# Imagen de desarrollo/prueba local de bff-web. Construida desde la raíz del
# monorepo porque depende de los workspaces (@sanciona/contracts). No es la
# imagen de despliegue a Cloudflare (eso es `wrangler deploy`, sin Docker);
# esta imagen sirve para levantar el stack completo en local con
# docker-compose y hacer una prueba real antes de subir a Elea.
FROM oven/bun:1.4-slim AS base
WORKDIR /repo

# Copiamos primero solo lo necesario para resolver dependencias (mejor cache).
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ai-provider/package.json packages/ai-provider/package.json
COPY services/deadlines-service/package.json services/deadlines-service/package.json
COPY apps/bff-web/package.json apps/bff-web/package.json

RUN bun install --frozen-lockfile

# Ahora el código completo.
COPY packages/contracts packages/contracts
COPY packages/ai-provider packages/ai-provider
COPY apps/bff-web apps/bff-web

WORKDIR /repo/apps/bff-web
EXPOSE 8080

# Modo dev (Vite + TanStack Start sirven SSR directamente sobre Bun). El
# build de producción usa el preset Nitro "cloudflare-module", pensado para
# desplegarse como Worker, no para correr en un contenedor Node/Bun — por
# eso la prueba local usa el servidor de desarrollo, no `bun run build`.
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
