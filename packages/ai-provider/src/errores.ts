/**
 * Errores del proveedor de IA, con códigos estables e independientes del
 * vendedor. Los servicios y la UI reaccionan al `codigo`, nunca al texto ni al
 * status HTTP concreto de un proveedor.
 */

export const CODIGOS_ERROR_IA = [
  "sin_credito",        // el saldo/cuota del proveedor se ha agotado
  "no_autorizado",      // API key ausente, inválida o revocada
  "limite_peticiones",  // rate limit
  "documento_invalido", // el proveedor rechaza el documento (formato, tamaño…)
  "sin_contenido",      // respuesta vacía
  "respuesta_ilegible", // el modelo no devolvió el JSON pedido
  "no_disponible",      // caída o error transitorio del proveedor
] as const;

export type CodigoErrorIA = (typeof CODIGOS_ERROR_IA)[number];

/** Mensajes en español, aptos para mostrar al usuario final. */
const MENSAJES: Record<CodigoErrorIA, string> = {
  sin_credito:
    "No hay saldo suficiente en el proveedor de IA para procesar el documento. Avisa al administrador.",
  no_autorizado:
    "La configuración del servicio de procesamiento es incorrecta. Avisa al administrador.",
  limite_peticiones:
    "Demasiadas solicitudes de procesamiento. Inténtalo de nuevo en unos minutos.",
  documento_invalido:
    "El documento no ha podido procesarse. Comprueba que sea un PDF o una imagen legible.",
  sin_contenido: "El servicio de procesamiento no ha devuelto contenido.",
  respuesta_ilegible:
    "No ha sido posible interpretar la información extraída del documento.",
  no_disponible:
    "El servicio de procesamiento no está disponible en este momento. Inténtalo más tarde.",
};

export class ErrorIA extends Error {
  readonly codigo: CodigoErrorIA;
  /** Detalle técnico para los logs. Nunca se muestra al usuario final. */
  readonly detalle: string | undefined;
  /** `true` si reintentar la misma petición puede funcionar. */
  readonly reintentable: boolean;

  constructor(codigo: CodigoErrorIA, detalle?: string) {
    super(MENSAJES[codigo]);
    this.name = "ErrorIA";
    this.codigo = codigo;
    this.detalle = detalle;
    this.reintentable = codigo === "limite_peticiones" || codigo === "no_disponible";
  }
}

/** Traduce un status HTTP de un proveedor al código de error del dominio. */
export function codigoDesdeStatus(status: number): CodigoErrorIA {
  if (status === 401 || status === 403) return "no_autorizado";
  if (status === 402) return "sin_credito";
  if (status === 429) return "limite_peticiones";
  if (status === 400 || status === 413 || status === 415) return "documento_invalido";
  return "no_disponible";
}
