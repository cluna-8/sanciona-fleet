# bff-web

Frontend de Sanciona Fleet. Nace como copia de `multas-export/` (el prototipo
exportado de Lovable) y es donde vive el desarrollo real a partir de la Etapa 1
del refactor — ver [`docs/refactor/PLAN-REFACTOR-FRONTEND.md`](../../docs/refactor/PLAN-REFACTOR-FRONTEND.md).

`multas-export/` queda como espejo de solo lectura de lo que genera Lovable.
Cada sincronización se porta a mano aquí; no se vuelve a copiar entero.

## Stack

TanStack Start (React 19 + SSR) · TanStack Router · TanStack Query · Tailwind
CSS 4 · shadcn/ui (podado a los componentes realmente usados) · Supabase ·
Vite 8 + Nitro (preset `cloudflare-module`).

Sin dependencia de `@lovable.dev/vite-tanstack-config`: `vite.config.ts` es
explícito.

## Desarrollo

```sh
cp .env.example .env   # rellenar con las claves de Supabase
bun install             # desde la raíz del monorepo
bun run dev              # dentro de apps/bff-web
```

```sh
bunx tsc --noEmit   # typecheck
bunx eslint .       # lint
bun run build        # build de producción (Nitro, target Cloudflare)
```

## Estado

Etapa 1 del plan de refactor completada: compila y construye sin Lovable,
dependencias podadas, CI en verde. Etapas 2-4 (capa de datos por feature,
descomposición de componentes, conexión a microservicios) en curso — ver el
plan para el detalle.
