/** Utilidades para hablar con modelos que devuelven JSON dentro de texto. */

import { ErrorIA } from "./errores";

/**
 * Extrae un objeto JSON de la respuesta del modelo.
 *
 * Los modelos suelen envolver el JSON en vallas ```json aunque se les pida lo
 * contrario, y a veces añaden una frase antes o después. Se limpia lo primero
 * y, si aun así no parsea, se recorta entre la primera `{` y la última `}`.
 */
export function extraerJson<T>(texto: string): T {
  const limpio = texto
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(limpio) as T;
  } catch {
    const inicio = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    if (inicio >= 0 && fin > inicio) {
      try {
        return JSON.parse(limpio.slice(inicio, fin + 1)) as T;
      } catch {
        /* cae al error de abajo */
      }
    }
    throw new ErrorIA("respuesta_ilegible", texto.slice(0, 500));
  }
}

/**
 * Convierte un ArrayBuffer a base64 sin desbordar la pila.
 *
 * `String.fromCharCode(...bytes)` revienta con documentos grandes al pasar
 * cientos de miles de argumentos, así que se trocea.
 */
export function bufferABase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  }
  return btoa(binario);
}
