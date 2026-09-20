import { test, expect } from "bun:test";
import { inflateRawSync } from "node:zlib";
import { parsearEscrito, type CabeceraEscrito } from "@/lib/escrito";
import { generarDocxEscrito } from "@/lib/docx-escrito.server";

// Bloque A del plan de export (RF-BORRADOR-4): OOXML real con la lib docx
// (sustituye al Blob HTML con extensión .doc).

const cabecera: CabeceraEscrito = {
  organizacion: "Transportes Prueba SL",
  cif: "B12345678",
  direccion: "Calle Mayor 1, 28001 Madrid",
  expediente: "EXP-2026-001",
  fecha: "20 de septiembre de 2026",
};

/**
 * Extrae `word/document.xml` del zip a mano: busca las cabeceras locales
 * PK\x03\x04 y localiza la entrada por nombre. Suficiente para un test (sin
 * dependencias extra); el parser real de .docx es Word/LibreOffice.
 */
function extraerDocumentXml(zip: Buffer): string {
  for (let offset = 0; offset + 30 < zip.length; offset++) {
    if (
      zip[offset] !== 0x50 ||
      zip[offset + 1] !== 0x4b ||
      zip[offset + 2] !== 0x03 ||
      zip[offset + 3] !== 0x04
    )
      continue;
    const metodo = zip.readUInt16LE(offset + 8);
    const tamComprimido = zip.readUInt32LE(offset + 18);
    const lonNombre = zip.readUInt16LE(offset + 26);
    const lonExtra = zip.readUInt16LE(offset + 28);
    const nombre = zip.subarray(offset + 30, offset + 30 + lonNombre).toString();
    if (nombre !== "word/document.xml") continue;
    const inicio = offset + 30 + lonNombre + lonExtra;
    const comprimido = zip.subarray(inicio, inicio + tamComprimido);
    // method 8 = deflate, method 0 = stored
    return (metodo === 8 ? inflateRawSync(comprimido) : comprimido).toString();
  }
  throw new Error("word/document.xml no encontrado en el zip");
}

test("genera un OOXML válido: magic header PK y peso creíble", async () => {
  const buffer = await generarDocxEscrito({
    bloques: parsearEscrito(
      "A LA DIRECCIÓN GENERAL DE TRÁFICO\n\nHechos que constan en el expediente sancionador.",
    ),
    cabecera,
    titulo: "Alegaciones · expediente EXP-2026-001",
  });
  expect(buffer.byteLength).toBeGreaterThan(1000);
  expect(buffer.subarray(0, 2).toString()).toBe("PK");
});

test("document.xml lleva la cabecera de empresa, los encabezados en bold y la justificación", async () => {
  const buffer = await generarDocxEscrito({
    bloques: parsearEscrito(
      "SOLICITA\n\nQue tenga por presentado este escrito, por ser procedente en derecho.",
    ),
    cabecera,
    titulo: "Alegaciones",
  });
  const xml = extraerDocumentXml(Buffer.from(buffer));
  expect(xml).toContain("Transportes Prueba SL");
  expect(xml).toContain("CIF: B12345678");
  expect(xml).toContain("Expediente: EXP-2026-001");
  expect(xml).toContain("SOLICITA");
  // Título en bold (w:b/) y párrafos justificados (w:jc w:val="both").
  expect(xml).toContain("<w:b/>");
  expect(xml).toContain('w:val="both"');
});
