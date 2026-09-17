// Config explícita de Vite/TanStack Start/Nitro, sin depender de
// @lovable.dev/vite-tanstack-config. Reemplaza ese paquete (Etapa 1 del
// plan de refactor, ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §1.4).
//
// Se conserva el comportamiento que sí afecta al build/runtime del producto
// (Tailwind, alias @, dedupe de React/TanStack Query, preset Cloudflare de
// Nitro, inyección de variables VITE_*). Se deja fuera deliberadamente todo
// lo que solo tenía sentido dentro del editor/sandbox de Lovable: el proxy
// de assets de preview, las devtools de Lovable, el "HMR gate", el puente de
// dev server, y los loggers de errores hacia el editor.
import { defineConfig, loadEnv, mergeConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const base = {
    define: envDefine,
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::" as const, port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      // Nitro solo participa en build: en dev, TanStack Start sirve directo.
      // Preset configurable por `NITRO_PRESET` (ADR 0003): por defecto `node-server`
      // para despliegue en AWS (EC2 + Docker); `cloudflare-module` sigue siendo
      // posible con NITRO_PRESET=cloudflare-module.
      ...(command === "build" ? [nitro({ preset: process.env["NITRO_PRESET"] ?? "node-server" })] : []),
      viteReact(),
    ],
  };

  return mergeConfig(base, {});
});
