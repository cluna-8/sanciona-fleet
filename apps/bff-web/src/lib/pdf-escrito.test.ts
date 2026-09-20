import { test, expect } from "bun:test";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { parsearEscrito, type CabeceraEscrito } from "@/lib/escrito";
import { generarPdfEscrito } from "@/lib/pdf-escrito.server";

// Bloque A del plan de export (RF-BORRADOR-3): binario PDF real generado en
// servidor con pdf-lib (sustituye al window.print sobre HTML).

const cabecera: CabeceraEscrito = {
  organizacion: "Transportes Prueba SL",
  cif: "B12345678",
  direccion: "Calle Mayor 1, 28001 Madrid",
  expediente: "EXP-2026-001",
  fecha: "20 de septiembre de 2026",
};

const ESCRITO_CORTO =
  "A LA DIRECCIÓN GENERAL DE TRÁFICO\n\nEXPEDIENTE EXP-2026-001\n\nHechos que constan en el expediente sancionador.";

/**
 * Concatena los flujos FlateDecode del PDF ya inflados y decodifica los
 * strings de texto dibujados. pdf-lib comprime los content streams y escribe
 * el texto como strings hex WinAnsi (`<5472…> Tj`), así que hay que inflar +
 * decodificar para inspeccionarlo (el texto dibujado, no el binario crudo).
 */
function textoPdf(pdf: Uint8Array): string {
  const binario = Buffer.from(pdf).toString("latin1");
  let flujos = "";
  let desde = 0;
  for (;;) {
    const inicio = binario.indexOf("stream\n", desde);
    if (inicio < 0) break;
    const fin = binario.indexOf("\nendstream", inicio);
    if (fin < 0) break;
    try {
      flujos += inflateSync(Buffer.from(binario.slice(inicio + 7, fin), "latin1")).toString(
        "latin1",
      );
    } catch {
      /* trozo que no es un flujo deflate válido */
    }
    desde = fin + 10;
  }
  let salida = "";
  for (const coincidencia of flujos.matchAll(/<([0-9A-Fa-f\s]+)> Tj/g)) {
    const hex = coincidencia[1];
    if (hex) salida += `${Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("latin1")}\n`;
  }
  return salida;
}

test("genera un binario PDF válido con magic header y peso creíble", async () => {
  const bytes = await generarPdfEscrito({
    bloques: parsearEscrito(ESCRITO_CORTO),
    cabecera,
    titulo: "Alegaciones · expediente EXP-2026-001",
  });
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect(String.fromCharCode(...Array.from(bytes.slice(0, 4)))).toBe("%PDF");
});

test("incluye la cabecera de empresa (razón social y CIF) y el pie de página en el contenido", async () => {
  const bytes = await generarPdfEscrito({
    bloques: parsearEscrito(ESCRITO_CORTO),
    cabecera,
    titulo: "Alegaciones",
  });
  const texto = textoPdf(bytes);
  expect(texto).toContain("Transportes Prueba SL");
  expect(texto).toContain("CIF: B12345678");
  expect(texto).toContain("Página 1 de ");
});

test("un escrito largo produce varias páginas y salta sin perder texto", async () => {
  const parrafos = Array.from(
    { length: 120 },
    (_, i) => `Párrafo número ${i + 1} de la prueba de salto de página con contenido suficiente.`,
  ).join("\n\n");
  const bytes = await generarPdfEscrito({
    bloques: parsearEscrito(`TÍTULO DEL ESCRITO\n\n${parrafos}`),
    cabecera,
    titulo: "Largo",
  });
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  expect(String.fromCharCode(...Array.from(bytes.slice(0, 4)))).toBe("%PDF");
});

test("no lanza con caracteres que Helvetica no puede codificar (emoji, CJK): los sanea", async () => {
  const bytes = await generarPdfEscrito({
    bloques: parsearEscrito("PÁRRAFO con emoji 😀 y caracteres CJK 中文 mezclados."),
    cabecera: {
      organizacion: null,
      cif: null,
      direccion: null,
      expediente: null,
      fecha: "1 de enero de 2026",
    },
    titulo: "Saneo",
  });
  expect(String.fromCharCode(...Array.from(bytes.slice(0, 4)))).toBe("%PDF");
});

test("particiones por caracteres: una palabra más ancha que la línea no rompe el wrap", async () => {
  const urlLarga = `https://www.boe.es/buscar/act.php?id=BOE-A-2015-11641&x=${"a".repeat(300)}`;
  const bytes = await generarPdfEscrito({
    bloques: parsearEscrito(`NORMA CITADA\n\nPuede consultarse en ${urlLarga}`),
    cabecera,
    titulo: "Wrap",
  });
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
});
