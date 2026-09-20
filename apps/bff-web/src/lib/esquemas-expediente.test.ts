import { test, expect } from "bun:test";
import {
  esquemaAnalizarExpediente,
  esquemaCrearExpediente,
  esquemaExportarBorrador,
  esquemaGenerarBorrador,
  esquemaProcesarDocumento,
  esquemaRecalcularPlazos,
  validar,
} from "@/lib/esquemas-expediente";

// Bloque A del plan de export: validación de la entrada de exportarBorrador.
// Bloque E (A-2): el resto de las server fns de expediente.

const DRAFT_ID = "123e4567-e89b-42d3-a456-426614174000";
const ORG_ID = "123e4567-e89b-42d3-a456-426614174111";
const SANCTION_ID = "123e4567-e89b-42d3-a456-426614174222";

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

test("los esquemas de id simple (procesar, analizar, recalcular) exigen uuid", () => {
  expect(esquemaProcesarDocumento.parse({ extractionId: DRAFT_ID })).toEqual({
    extractionId: DRAFT_ID,
  });
  expect(esquemaAnalizarExpediente.parse({ sanctionId: SANCTION_ID })).toEqual({
    sanctionId: SANCTION_ID,
  });
  expect(esquemaRecalcularPlazos.parse({ sanctionId: SANCTION_ID })).toEqual({
    sanctionId: SANCTION_ID,
  });
  for (const esquema of [
    esquemaProcesarDocumento,
    esquemaAnalizarExpediente,
    esquemaRecalcularPlazos,
  ]) {
    expect(() => esquema.parse({})).toThrow();
  }
});

test("generarBorrador solo acepta Alegaciones o Recurso", () => {
  expect(esquemaGenerarBorrador.parse({ sanctionId: SANCTION_ID, kind: "Recurso" }).kind).toBe(
    "Recurso",
  );
  expect(() => esquemaGenerarBorrador.parse({ sanctionId: SANCTION_ID, kind: "otro" })).toThrow();
});

test("crearExpediente degrada confianza basura a Bajo y fuente ausente a null (catch)", () => {
  const entrada = {
    extractionId: DRAFT_ID,
    campos: {
      numero_expediente: {
        valor: "EXP-1",
        confianza: "basura",
        fuente: "literal del documento",
      },
      importe: { valor: 200, confianza: "Alto" },
    },
    vehicleId: null,
    driverId: null,
    documentType: "Notificación DGT",
  };
  const salida = esquemaCrearExpediente.parse(entrada);
  expect(salida.campos["numero_expediente"]?.confianza).toBe("Bajo");
  expect(salida.campos["importe"]?.fuente).toBeNull();
  expect(salida.campos["importe"]?.valor).toBe(200);
});

test("crearExpediente rechaza tipos que romperían la base de datos", () => {
  const baseCrear = {
    extractionId: DRAFT_ID,
    campos: { a: { valor: "x", confianza: "Alto", fuente: null } },
    vehicleId: null,
    driverId: null,
    documentType: "Notificación DGT",
  };
  expect(() => esquemaCrearExpediente.parse({ ...baseCrear, vehicleId: "no-uuid" })).toThrow();
  expect(() => esquemaCrearExpediente.parse({ ...baseCrear, documentType: "" })).toThrow();
  // Un valor que no es string/número/booleano/null no entra (p.ej. un objeto
  // inyectado vía el payload del cliente).
  expect(() =>
    esquemaCrearExpediente.parse({
      ...baseCrear,
      campos: { a: { valor: { hack: 1 }, confianza: "Alto", fuente: null } },
    }),
  ).toThrow();
});

test("crearExpediente hace strip de claves desconocidas del payload", () => {
  const entrada = {
    extractionId: DRAFT_ID,
    campos: { a: { valor: "x", confianza: "Alto", fuente: null } },
    vehicleId: null,
    driverId: null,
    documentType: "Notificación DGT",
    confirmadoPorUsuario: true,
    rol_inyectado: "platform_admin",
  };
  const salida = esquemaCrearExpediente.parse(entrada);
  expect(salida).not.toHaveProperty("rol_inyectado");
  expect(salida.confirmadoPorUsuario).toBe(true);
});
