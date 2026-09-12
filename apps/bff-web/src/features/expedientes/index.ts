export { useSanciones, useSancion, useActuaciones, useComentarios } from "./api/queries";
export {
  useCambiarEstado,
  useAñadirComentario,
  useCrearSancionManual,
  type DatosSancionManual,
} from "./api/mutations";
export { expedientesKeys } from "./api/keys";
export type { Sancion, Actuacion, Comentario } from "@sanciona/contracts";
