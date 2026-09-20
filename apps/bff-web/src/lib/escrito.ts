/**
 * Parser compartido del texto de los escritos (alegaciones/recursos).
 *
 * El modelo redacta el escrito en texto plano con encabezados en mayúsculas
 * (SISTEMA_BORRADOR, packages/ai-provider/src/prompts.ts). Este módulo convierte
 * ese texto en bloques con jerarquía tipográfica para que los generadores de
 * PDF y DOCX (pdf-escrito.server.ts / docx-escrito.server.ts) rendericen lo
 * mismo que producía el HTML antiguo de lib/documento.ts, eliminado en esta
 * rama. Lógica pura: sin React, sin servidor, testeable en bun test.
 */

export type BloqueEscrito =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "espacio"; texto: "" };

/** Datos de la empresa/expediente que encabezan el documento generado. */
export type CabeceraEscrito = {
  organizacion: string | null;
  cif: string | null;
  direccion: string | null;
  expediente: string | null;
  /** Fecha de generación, ya formateada para el documento. */
  fecha: string;
};

/**
 * Heurística heredada de documento.ts: encabezado = línea en mayúsculas de
 * 3 a 90 caracteres con al menos una letra del alfabeto español.
 */
export function esTituloEscrito(linea: string): boolean {
  const t = linea.trim();
  if (t.length < 3 || t.length > 90) return false;
  return t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t);
}

/** Convierte el texto plano del escrito en bloques con jerarquía tipográfica. */
export function parsearEscrito(texto: string): BloqueEscrito[] {
  const bloques: BloqueEscrito[] = [];
  let primerTituloUsado = false;
  for (const linea of texto.replace(/\r\n/g, "\n").split("\n")) {
    const t = linea.trim();
    if (!t) {
      bloques.push({ tipo: "espacio", texto: "" });
      continue;
    }
    if (esTituloEscrito(t)) {
      if (!primerTituloUsado) {
        primerTituloUsado = true;
        bloques.push({ tipo: "titulo", texto: t });
      } else {
        bloques.push({ tipo: "subtitulo", texto: t });
      }
      continue;
    }
    // El párrafo conserva el texto original (sangrías incluidas), como el
    // cuerpo HTML anterior.
    bloques.push({ tipo: "parrafo", texto: linea });
  }
  return bloques;
}

/**
 * Elimina los caracteres que la fuente WinAnsi de pdf-lib no puede codificar
 * (pdf-lib LANZA al codificarlos: emoji, CJK, símbolos raros). Los acentos, la
 * `ñ`, `¿¡`, el `€`, las comillas tipográficas y las rayas están en cp1252 y se
 * conservan tal cual.
 *
 * `codificable` se inyecta para poder testear la lógica sin una fuente real:
 * pdf-escrito.server.ts pasa un probe sobre la Helvetica del documento (con
 * caché por carácter).
 */
export function sanearTextoPdf(texto: string, codificable: (caracter: string) => boolean): string {
  let salida = "";
  for (const caracter of texto.normalize("NFKC")) {
    if (caracter === "\n" || caracter === "\r" || caracter === "\t") {
      salida += caracter;
      continue;
    }
    salida += codificable(caracter) ? caracter : "";
  }
  return salida;
}

/** Nombre de fichero de export: saneado, acotado y con la versión (`-v3.pdf`). */
export function nombreArchivoEscrito(titulo: string, version: number, ext: "pdf" | "docx"): string {
  const base = titulo
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `${base || "escrito"}-v${version}.${ext}`;
}
