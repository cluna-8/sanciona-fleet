/**
 * Interfaz única de IA del sistema.
 *
 * `extraction-service`, `analysis-service` y `drafts-service` dependen SOLO de
 * `ProveedorIA`. Cambiar de Google a OpenAI, Anthropic u otro se hace en la
 * configuración, sin tocar esos tres servicios (SPEC.md §7.1, RF-ANALISIS-4).
 *
 * Esta es la corrección del bloqueador #1 del inventario: el monolito llamaba
 * directamente a `ai.gateway.lovable.dev` con `LOVABLE_API_KEY` hardcodeados,
 * lo que ataba el producto al workspace de Lovable y a sus créditos.
 */
import type {
  FuenteVerificada,
  ResultadoAnalisis,
  ResultadoExtraccion,
  ResultadoRedaccion,
  TipoEscrito,
} from "@sanciona/contracts";

/** Documento a procesar, ya descargado del Storage. */
export type DocumentoEntrada = {
  nombre: string;
  /** MIME real. Se usa para decidir si va como imagen o como fichero. */
  mime: string;
  contenido: ArrayBuffer;
};

export type PeticionExtraccion = {
  documento: DocumentoEntrada;
};

export type PeticionAnalisis = {
  /** Expediente + plazos ya calculados + avisos de extracción, serializable. */
  contexto: unknown;
  /** Catálogo cerrado de normas citables. Sin esto el modelo inventa fuentes. */
  fuentes: FuenteVerificada[];
};

export type PeticionRedaccion = {
  tipo: TipoEscrito;
  contexto: unknown;
  fuentes: FuenteVerificada[];
};

export interface ProveedorIA {
  /** Nombre del proveedor, para logs y trazabilidad. */
  readonly nombre: string;

  /** Lee un PDF o imagen y devuelve los campos del expediente. Hace OCR si hace falta. */
  extraer(peticion: PeticionExtraccion): Promise<ResultadoExtraccion>;

  /** Análisis preliminar del expediente. No calcula plazos: los recibe hechos. */
  analizar(peticion: PeticionAnalisis): Promise<ResultadoAnalisis>;

  /** Redacta el borrador de alegaciones o recurso. Siempre lo revisa un humano. */
  redactar(peticion: PeticionRedaccion): Promise<ResultadoRedaccion>;
}

/** Proveedores soportados. `openai-compatible` cubre OpenRouter y similares. */
export const PROVEEDORES = ["google", "openai", "anthropic", "openai-compatible"] as const;
export type NombreProveedor = (typeof PROVEEDORES)[number];

export type ConfiguracionIA = {
  proveedor: NombreProveedor;
  apiKey: string;
  /** Modelo para extraer y analizar. Debe admitir entrada multimodal. */
  modeloExtraccion: string;
  modeloAnalisis: string;
  /** Solo para `openai-compatible`: URL base del endpoint. */
  urlBase?: string;
  /** Timeout por llamada. Un PDF escaneado grande puede tardar. */
  timeoutMs?: number;
};

export const TIMEOUT_POR_DEFECTO_MS = 120_000;
