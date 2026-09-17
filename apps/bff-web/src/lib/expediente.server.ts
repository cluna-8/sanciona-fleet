/**
 * Utilidades de servidor del motor de análisis. No se importa nunca desde el
 * cliente.
 *
 * Adaptador fino sobre `@sanciona/ai-provider` (ADR 0001 + ADR 0003). Sustituye
 * la llamada directa al gateway de IA de Lovable (`ai.gateway.lovable.dev` +
 * `LOVABLE_API_KEY`) por el proveedor intercambiable, sin tocar los handlers de
 * `expediente.functions.ts`: estos siguen importando `llamarModelo`,
 * `MODELO_*`, `SISTEMA_*`, `aBloqueArchivo`, `bufferABase64`, `extraerJson` desde
 * aquí, con las mismas firmas. Cuando los tres handlers migren a
 * `ia.extraer()/analizar()/redactar()`, este archivo desaparece.
 *
 * El proveedor se elige con `IA_PROVEEDOR` (default `openrouter` en producción,
 * ADR 0003). Las claves y modelos viven en variables de entorno, gestionadas
 * en producción por AWS SSM Parameter Store (no por `wrangler secret`).
 */
import {
  type Bloque as BloqueIA,
  crearProveedorDesdeEntorno,
  type EntornoIA,
  type ProveedorIA,
} from "@sanciona/ai-provider";
import {
  bufferABase64 as bufferABase64IA,
  extraerJson as extraerJsonIA,
  SISTEMA_ANALISIS,
  SISTEMA_BORRADOR,
  SISTEMA_EXTRACCION,
} from "@sanciona/ai-provider";

// Re-exportados para que expediente.functions.ts siga importándolos del mismo
// sitio. Sin duplicar: la fuente de verdad es @sanciona/ai-provider.
export { SISTEMA_ANALISIS, SISTEMA_BORRADOR, SISTEMA_EXTRACCION };
export const extraerJson = extraerJsonIA;
export const bufferABase64 = bufferABase64IA;

/**
 * Modelos. En producción (OpenRouter) hay que configurar slugs reales (los del
 * gateway de Lovable, p. ej. `google/gemini-3.7-flash`, NO existen en OpenRouter)
 * y la extracción exige un modelo con entrada multimodal (PDF + imagen).
 */
export const MODELO_EXTRACCION = process.env["IA_MODELO_EXTRACCION"] ?? "gemini-3.7-flash";
export const MODELO_ANALISIS = process.env["IA_MODELO_ANALISIS"] ?? "gemini-3.7-flash";

/** Bloque en formato OpenAI que consume `expediente.functions.ts`. */
export type Bloque =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export type RespuestaGateway = { contenido: string; modelo: string };

/** Singleton perezoso del proveedor de IA, construido una vez por proceso. */
let proveedorCache: ProveedorIA | null = null;
function proveedor(): ProveedorIA {
  if (!proveedorCache) {
    const env: EntornoIA = {
      IA_PROVEEDOR: process.env["IA_PROVEEDOR"],
      IA_API_KEY: process.env["IA_API_KEY"],
      IA_MODELO_EXTRACCION: process.env["IA_MODELO_EXTRACCION"],
      IA_MODELO_ANALISIS: process.env["IA_MODELO_ANALISIS"],
      IA_URL_BASE: process.env["IA_URL_BASE"],
      IA_TIMEOUT_MS: process.env["IA_TIMEOUT_MS"],
    };
    proveedorCache = crearProveedorDesdeEntorno(env);
  }
  return proveedorCache;
}

/** Convierte un `Bloque` OpenAI (el que usa functions.ts) al `Bloque` del paquete. */
function aBloqueIA(b: Bloque): BloqueIA {
  if (b.type === "text") return { tipo: "texto", texto: b.text };
  if (b.type === "image_url") {
    // data:<mime>;base64,<b64>
    const partes = b.image_url.url.split(",");
    const cabecera = partes[0] ?? "";
    const mime = cabecera.match(/data:([^;]+)/)?.[1] ?? "image/png";
    return { tipo: "imagen", mime, base64: partes[1] ?? "" };
  }
  const partes = b.file.file_data.split(",");
  const cabecera = partes[0] ?? "";
  const mime = cabecera.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  return { tipo: "documento", nombre: b.file.filename, mime, base64: partes[1] ?? "" };
}

/**
 * Llama al modelo a través del proveedor intercambiable. Misma firma que el
 * gateway de Lovable original: `{ contenido, modelo }`.
 */
export async function llamarModelo(opciones: {
  modelo: string;
  sistema: string;
  bloques: Bloque[];
  jsonEstricto?: boolean;
}): Promise<RespuestaGateway> {
  const args: {
    modelo: string;
    sistema: string;
    bloques: BloqueIA[];
    jsonEstricto?: boolean;
  } = {
    modelo: opciones.modelo,
    sistema: opciones.sistema,
    bloques: opciones.bloques.map(aBloqueIA),
  };
  if (opciones.jsonEstricto !== undefined) args.jsonEstricto = opciones.jsonEstricto;
  return proveedor().llamar(args);
}

/** Mantiene la forma OpenAI que usa `expediente.functions.ts` para construir bloques. */
export function aBloqueArchivo(nombre: string, mime: string, base64: string): Bloque {
  if (mime.startsWith("image/")) {
    return { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
  }
  return { type: "file", file: { filename: nombre, file_data: `data:${mime};base64,${base64}` } };
}
