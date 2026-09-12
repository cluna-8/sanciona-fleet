/**
 * @deprecated Shim de compatibilidad de la Etapa 2 del refactor. Las
 * constantes de dominio (estados, roles, categorías…) ahora viven en
 * @sanciona/contracts y el formato puro en shared/lib/formato.ts — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §2.3. Este archivo solo reexporta
 * para no tener que tocar cada importador en la misma Etapa 2; se retira en
 * Etapa 3 cuando cada feature se mueva a su carpeta definitiva.
 */
export {
  ROLES,
  type Rol,
  ESTADOS_SANCION,
  type EstadoSancion,
  ESTADOS_ABIERTOS,
  PRIORIDADES,
  type Prioridad,
  CATEGORIAS,
  ORGANISMOS,
  TIPOS_VEHICULO,
  TIPOS_DOCUMENTO,
  TIPOS_ACTUACION,
  puedeGestionar,
  esAdministrador,
} from "@sanciona/contracts";

export {
  parseImporte,
  formatoImporte,
  formatoFecha,
  diasRestantes,
  type NivelAlerta,
  nivelPlazo,
  CLASES_ALERTA,
  textoPlazo,
  CLASES_ESTADO,
  CLASES_PRIORIDAD,
  etiquetaRol,
} from "@/shared/lib/formato";
