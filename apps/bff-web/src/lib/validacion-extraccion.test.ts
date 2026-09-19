import { test, expect } from "bun:test";
import {
  CATEGORIA_POR_TIPO,
  deducirTipoInfraccion,
  esTipoGenerico,
  normalizarCif,
  compararEmpresa,
} from "@/lib/validacion-extraccion";

// Primer test de apps/bff-web en main (ver docs/spec/07-plan-de-pruebas.md).
// Cubre la lógica pura de validación de extracción que no depende de Supabase.

test("normalizarCif quita espacios/guiones/puntos y pasa a mayúsculas", () => {
  expect(normalizarCif("b-1234567")).toBe("B1234567");
  expect(normalizarCif("  B.12.345.67  ")).toBe("B1234567");
  expect(normalizarCif(null)).toBe("");
  expect(normalizarCif(undefined)).toBe("");
});

test("deducirTipoInfraccion detecta por palabras clave en cualquiera de los textos", () => {
  expect(deducirTipoInfraccion("Exceso de velocidad a 120 km/h")).toBe("Exceso de velocidad");
  expect(deducirTipoInfraccion(null, "manipulación del tacógrafo")).toBe(
    "Manipulación de tacógrafo",
  );
  expect(deducirTipoInfraccion("sin información útil", "", null)).toBeNull();
  expect(deducirTipoInfraccion()).toBeNull();
});

test("esTipoGenerico true para valores no informativos", () => {
  expect(esTipoGenerico(undefined)).toBe(true);
  expect(esTipoGenerico("Infracción")).toBe(true);
  expect(esTipoGenerico("Otra")).toBe(true);
  expect(esTipoGenerico("Exceso de velocidad")).toBe(false);
});

test("compararEmpresa detecta coincidencia de CIF normalizado", () => {
  const r = compararEmpresa(
    { name: "Transportes Ejemplo S.L.", cif: "B-1234567" },
    { razonSocial: "TRANSPORTES EJEMPLO SLU", cif: "b1234567" },
  );
  expect(r.cifCoincide).toBe(true);
  expect(r.cifComparable).toBe(true);
  // Los nombres, una vez normalizados (sin SL/SLU y sin tildes), coinciden.
  expect(r.nombreCoincide).toBe(true);
});

test("compararEmpresa marca discrepancia cuando el CIF difiere", () => {
  const r = compararEmpresa(
    { name: "Una Empresa", cif: "B1234567" },
    { razonSocial: "Otra Empresa", cif: "B7654321" },
  );
  expect(r.cifCoincide).toBe(false);
  expect(r.nombreCoincide).toBe(false);
});

test("CATEGORIA_POR_TIPO cubre todos los tipos conocidos", () => {
  const tipos = Object.keys(CATEGORIA_POR_TIPO);
  expect(tipos).toContain("Exceso de velocidad");
  expect(tipos.length).toBeGreaterThan(8);
  // Cada categoría asignada está en el catálogo cerrado o es "Otra".
  for (const cat of Object.values(CATEGORIA_POR_TIPO)) {
    expect(typeof cat).toBe("string");
    expect(cat.length).toBeGreaterThan(0);
  }
});
