import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Etapa 2/3 del plan de refactor (docs/refactor/PLAN-REFACTOR-FRONTEND.md
    // §2.6 y §cierre): ninguna ruta ni componente/página de feature habla con
    // Supabase directamente. Solo features/*/api/* y los módulos *.server.ts /
    // *.functions.ts lo hacen.
    files: [
      "src/routes/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/features/**/components/**/*.{ts,tsx}",
      "src/features/**/pages/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
          patterns: [
            {
              group: ["@/integrations/supabase/*", "@supabase/supabase-js"],
              message:
                "Las rutas y componentes no hablan con Supabase directamente (Etapa 2 del refactor). Añade o usa un hook en features/*/api/ en su lugar.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
