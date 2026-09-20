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
// Re-exportados para que apps/bff-web los consuma del paquete en la migración
// (ADR 0003) sin duplicarlos en expediente.server.ts.
export { extraerJson, bufferABase64 } from "./json";
export { documentoABloque, type Bloque } from "./proveedores/base";

import { ErrorIA } from "./errores";
import { ProveedorAnthropic } from "./proveedores/anthropic";
import { ProveedorGoogle } from "./proveedores/google";
import { ProveedorOpenAICompatible } from "./proveedores/openai-compatible";
import {
  PROVEEDORES,
  REINTENTOS_POR_DEFECTO,
  type ConfiguracionIA,
  type NombreProveedor,
  type ProveedorIA,
} from "./tipos";

/** URL base por defecto para OpenRouter. */
const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

export function crearProveedor(config: ConfiguracionIA): ProveedorIA {
  switch (config.proveedor) {
    case "google":
      return new ProveedorGoogle(config);
    case "anthropic":
      return new ProveedorAnthropic(config);
    case "openai":
    case "openai-compatible":
      return new ProveedorOpenAICompatible(config);
    case "openrouter":
      // Alias de openai-compatible con urlBase por defecto OpenRouter.
      return new ProveedorOpenAICompatible({
        ...config,
        ...(config.urlBase ? {} : { urlBase: URL_OPENROUTER }),
      });
    default: {
      // Si algún día se añade un proveedor al tipo y no aquí, esto no compila.
      const _exhaustivo: never = config.proveedor;
      throw new ErrorIA("no_autorizado", `proveedor desconocido: ${String(_exhaustivo)}`);
    }
  }
}

/**
 * Variables de entorno esperadas por cada servicio que use IA.
 *
 * Los campos aceptan `undefined` explícito para poder construirse desde
 * `process.env` (donde toda clave ausente es `string | undefined`) incluso con
 * `exactOptionalPropertyTypes: true` en el consumidor.
 */
export type EntornoIA = {
  IA_PROVEEDOR?: string | undefined;
  IA_API_KEY?: string | undefined;
  IA_MODELO_EXTRACCION?: string | undefined;
  IA_MODELO_ANALISIS?: string | undefined;
  IA_URL_BASE?: string | undefined;
  IA_TIMEOUT_MS?: string | undefined;
  /** Reintentos extra ante 429/transitorios (A-3a). */
  IA_REINTENTOS_MAX?: string | undefined;
  /** Base del backoff de reintentos, en ms (A-3a). */
  IA_REINTENTO_BASE_MS?: string | undefined;
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
  const reintentosMax = Number(env.IA_REINTENTOS_MAX);
  const reintentosBase = Number(env.IA_REINTENTO_BASE_MS);

  return crearProveedor({
    proveedor,
    apiKey: env.IA_API_KEY,
    modeloExtraccion: env.IA_MODELO_EXTRACCION ?? MODELO_POR_DEFECTO,
    modeloAnalisis: env.IA_MODELO_ANALISIS ?? MODELO_POR_DEFECTO,
    ...(env.IA_URL_BASE ? { urlBase: env.IA_URL_BASE } : {}),
    ...(Number.isFinite(timeout) && timeout > 0 ? { timeoutMs: timeout } : {}),
    reintentos: {
      maxIntentosExtra:
        Number.isFinite(reintentosMax) && reintentosMax >= 0
          ? Math.floor(reintentosMax)
          : REINTENTOS_POR_DEFECTO.maxIntentosExtra,
      baseMs:
        Number.isFinite(reintentosBase) && reintentosBase > 0
          ? Math.round(reintentosBase)
          : REINTENTOS_POR_DEFECTO.baseMs,
    },
  });
}
