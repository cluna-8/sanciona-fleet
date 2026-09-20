import { test, expect } from "bun:test";
import { esquemaExportarBorrador, validar } from "@/lib/esquemas-expediente";

// Bloque A del plan de export: validación de la entrada de exportarBorrador.
// El resto de esquemas (Bloque E, A-2) se añaden a este fichero.

const DRAFT_ID = "123e4567-e89b-42d3-a456-426614174000";
const ORG_ID = "123e4567-e89b-42d3-a456-426614174111";

const base = { draftId: DRAFT_ID, organizationId: ORG_ID, formato: "pdf" } as const;

test("acepta pdf y docx, con versionId opcional", () => {
  expect(esquemaExportarBorrador.parse(base)).toEqual({ ...base });
  expect(esquemaExportarBorrador.parse({ ...base, formato: "docx" }).formato).toBe("docx");
  const conVersion = { ...base, versionId: "123e4567-e89b-42d3-a456-426614174222" };
  expect(esquemaExportarBorrador.parse(conVersion)).toEqual(conVersion);
});

test("rechaza ids no uuid y formatos no soportados", () => {
  expect(() => esquemaExportarBorrador.parse({ ...base, draftId: "no-un-uuid" })).toThrow();
  expect(() => esquemaExportarBorrador.parse({ ...base, organizationId: 42 })).toThrow();
  expect(() => esquemaExportarBorrador.parse({ ...base, formato: "rtf" })).toThrow();
  expect(() => esquemaExportarBorrador.parse({ ...base, versionId: "x" })).toThrow();
});

test("hace strip de claves desconocidas: al handler solo llega lo previsto", () => {
  const salida = esquemaExportarBorrador.parse({ ...base, sorpresa: "<script>" });
  expect(salida).toEqual({ ...base });
});

test("validar devuelve los datos parseados como inputValidator", () => {
  expect(validar(esquemaExportarBorrador)({ ...base, formato: "docx" }).formato).toBe("docx");
});

test("validar lanza un Error legible con el primer issue (para el toast)", () => {
  let mensaje = "";
  try {
    validar(esquemaExportarBorrador)({ ...base, draftId: "malo" });
  } catch (e) {
    mensaje = (e as Error).message;
  }
  expect(mensaje).toContain("draftId");
  expect(mensaje).toContain("uuid");
});
