import { test, expect } from "bun:test";
import {
  esTituloEscrito,
  nombreArchivoEscrito,
  parsearEscrito,
  sanearTextoPdf,
} from "@/lib/escrito";

// Bloque A del plan de export (RF-BORRADOR-3/4): lógica pura del parser de
// escritos, heredada de la heurística del HTML antiguo de lib/documento.ts.

test("parsearEscrito convierte la primera línea en mayúsculas en título y las siguientes en subtítulos", () => {
  const bloques = parsearEscrito(
    "A LA DIRECCIÓN GENERAL DE TRÁFICO\n\nEXPEDIENTE 12345678\n\nHechos que constan en el expediente.",
  );
  expect(bloques[0]).toEqual({ tipo: "titulo", texto: "A LA DIRECCIÓN GENERAL DE TRÁFICO" });
  expect(bloques[1]).toEqual({ tipo: "espacio", texto: "" });
  expect(bloques[2]).toEqual({ tipo: "subtitulo", texto: "EXPEDIENTE 12345678" });
  expect(bloques[3]).toEqual({ tipo: "espacio", texto: "" });
  expect(bloques[4]).toEqual({ tipo: "parrafo", texto: "Hechos que constan en el expediente." });
});

test("parsearEscrito degrada a párrafo las mayúsculas de más de 90 caracteres", () => {
  const largo = "A".repeat(91);
  const bloques = parsearEscrito(largo);
  expect(bloques).toEqual([{ tipo: "parrafo", texto: largo }]);
});

test("parsearEscrito conserva el texto original de los párrafos (sangrías incluidas) y normaliza CRLF", () => {
  const bloques = parsearEscrito("  línea con sangría\r\nOTRA LÍNEA\r\núltima");
  expect(bloques).toEqual([
    { tipo: "parrafo", texto: "  línea con sangría" },
    { tipo: "titulo", texto: "OTRA LÍNEA" },
    { tipo: "parrafo", texto: "última" },
  ]);
});

test("esTituloEscrito acepta encabezados con tildes y ñ y rechaza minúsculas o demasiado cortos", () => {
  expect(esTituloEscrito("ÓRGANO COMPETENTE")).toBe(true);
  expect(esTituloEscrito("OTORGAMIENTO DE PODERES")).toBe(true);
  expect(esTituloEscrito("Hechos")).toBe(false);
  expect(esTituloEscrito("NO")).toBe(false);
  expect(esTituloEscrito("   ")).toBe(false);
});

test("sanearTextoPdf conserva acentos, signos españoles y comillas cuando la fuente los admite", () => {
  const texto = "Álvaro Muñoz — ¿cuánto cuesta “esto”? ¡100 € por el tacógrafo!";
  expect(sanearTextoPdf(texto, () => true)).toBe(texto);
});

test("sanearTextoPdf elimina los caracteres que la fuente no puede codificar y conserva saltos de línea", () => {
  const soloEmojiFalla = (caracter: string) => caracter !== "😀";
  expect(sanearTextoPdf("hola😀mundo", soloEmojiFalla)).toBe("holamundo");
  expect(sanearTextoPdf("primera\nsegunda😀\ntercera", soloEmojiFalla)).toBe(
    "primera\nsegunda\ntercera",
  );
});

test("sanearTextoPdf normaliza a NFKC antes del test por carácter", () => {
  // La ligatura ﬁ se descompone en "fi", que sí es codificable.
  expect(sanearTextoPdf("ﬁn", () => true)).toBe("fin");
});

test("nombreArchivoEscrito sanea el título y añade versión y extensión", () => {
  expect(nombreArchivoEscrito("Alegaciones · expediente EXP-1", 3, "pdf")).toBe(
    "Alegaciones-expediente-EXP-1-v3.pdf",
  );
});

test("nombreArchivoEscrito recorta a 60 caracteres de base y cae a escrito si el título queda vacío", () => {
  const largo = nombreArchivoEscrito("X".repeat(80), 2, "docx");
  expect(largo.length).toBeLessThanOrEqual(60 + "-v2.docx".length);
  expect(nombreArchivoEscrito("···", 1, "pdf")).toBe("escrito-v1.pdf");
});
