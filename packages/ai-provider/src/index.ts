/**
 * @sanciona/ai-provider
 *
 * Punto único por el que el sistema habla con un modelo. Sustituye la llamada
 * directa a `ai.gateway.lovable.dev` del monolito (bloqueador #1 del
 * inventario) por una interfaz con proveedor intercambiable.
 *
 * Uso desde un servicio:
 *
 *   const ia = crearProveedorDesdeEntorno(env);
 *   const { campos, avisos } = await ia.extraer({ documento });
 */
export * from "./errores";
export * from "./tipos";
export { SISTEMA_ANALISIS, SISTEMA_BORRADOR, SISTEMA_EXTRACCION } from "./prompts";
export { camposCriticosDudosos } from "./normalizar";

import { ErrorIA } from "./errores";
import { ProveedorAnthropic } from "./proveedores/anthropic";
import { ProveedorGoogle } from "./proveedores/google";
import { ProveedorOpenAICompatible } from "./proveedores/openai-compatible";
import { PROVEEDORES, type ConfiguracionIA, type NombreProveedor, type ProveedorIA } from "./tipos";

export function crearProveedor(config: ConfiguracionIA): ProveedorIA {
  switch (config.proveedor) {
    case "google":
      return new ProveedorGoogle(config);
    case "anthropic":
      return new ProveedorAnthropic(config);
    case "openai":
    case "openai-compatible":
      return new ProveedorOpenAICompatible(config);
    default: {
      // Si algún día se añade un proveedor al tipo y no aquí, esto no compila.
      const _exhaustivo: never = config.proveedor;
      throw new ErrorIA("no_autorizado", `proveedor desconocido: ${String(_exhaustivo)}`);
    }
  }
}

/** Variables de entorno esperadas por cada Worker que use IA. */
export type EntornoIA = {
  IA_PROVEEDOR?: string;
  IA_API_KEY?: string;
  IA_MODELO_EXTRACCION?: string;
  IA_MODELO_ANALISIS?: string;
  IA_URL_BASE?: string;
  IA_TIMEOUT_MS?: string;
};

/**
 * Modelo por defecto: el mismo que usaba el monolito, para que la migración no
 * cambie a la vez el proveedor y la calidad de la salida.
 */
const MODELO_POR_DEFECTO = "gemini-3.7-flash";

export function crearProveedorDesdeEntorno(env: EntornoIA): ProveedorIA {
  const proveedor = (env.IA_PROVEEDOR ?? "google") as NombreProveedor;
  if (!PROVEEDORES.includes(proveedor)) {
    throw new ErrorIA(
      "no_autorizado",
      `IA_PROVEEDOR="${proveedor}" no es válido. Opciones: ${PROVEEDORES.join(", ")}`,
    );
  }
  if (!env.IA_API_KEY) {
    throw new ErrorIA("no_autorizado", "falta la variable de entorno IA_API_KEY");
  }

  const timeout = Number(env.IA_TIMEOUT_MS);

  return crearProveedor({
    proveedor,
    apiKey: env.IA_API_KEY,
    modeloExtraccion: env.IA_MODELO_EXTRACCION ?? MODELO_POR_DEFECTO,
    modeloAnalisis: env.IA_MODELO_ANALISIS ?? MODELO_POR_DEFECTO,
    ...(env.IA_URL_BASE ? { urlBase: env.IA_URL_BASE } : {}),
    ...(Number.isFinite(timeout) && timeout > 0 ? { timeoutMs: timeout } : {}),
  });
}
