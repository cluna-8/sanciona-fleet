#!/usr/bin/env node
/**
 * Gate de Etapa 3 (docs/refactor/PLAN-REFACTOR-FRONTEND.md §cierre): falla si
 * algún archivo bajo `src/features/` o `src/routes/` supera el límite de
 * líneas permitido. Excluye tests y módulos heredados `*.functions.ts` /
 * `*.server.ts` (capa de datos, no componentes). Criterio de salida de la
 * etapa; corre en CI para evitar regresiones.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const LIMITE = 250;
const EXCLUIR = /\.(test|spec)\.(ts|tsx)$|\.functions\.ts$|\.server\.ts$/;

const excedidos = [];

function recorrer(dir) {
  for (const entry of readdirSync(dir)) {
    const ruta = join(dir, entry);
    const st = statSync(ruta);
    if (st.isDirectory()) {
      recorrer(ruta);
    } else if (/\.(ts|tsx)$/.test(entry) && !EXCLUIR.test(entry)) {
      const lineas = readFileSync(ruta, "utf8").split("\n").length;
      if (lineas > LIMITE) excedidos.push({ ruta: relative(ROOT, ruta), lineas });
    }
  }
}

for (const base of ["features", "routes"]) {
  recorrer(join(ROOT, base));
}

if (excedidos.length) {
  console.error(
    `✖ Etapa 3: ${excedidos.length} archivo(s) bajo src/features o src/routes superan ${LIMITE} líneas:`,
  );
  for (const { ruta, lineas } of excedidos.sort((a, b) => b.lineas - a.lineas)) {
    console.error(`  ${String(lineas).padStart(4)}  ${ruta}`);
  }
  console.error(
    "Descompón el archivo en componentes/páginas más pequeños (ver PLAN-REFACTOR-FRONTEND.md §3).",
  );
  process.exit(1);
}

console.log(`✔ Etapa 3: ningún archivo bajo src/features ni src/routes supera ${LIMITE} líneas.`);
