export { useBorradores, useBorrador, useVersiones, borradoresKeys } from "./api/queries";
export { useGuardarVersion, useCambiarEstadoBorrador } from "./api/mutations";
export type { Borrador, BorradorConSancion, VersionBorrador } from "./api/client";
// Server fn (consumido vía useServerFn desde analisis) — Etapa 3.8
export { generarBorrador } from "./api/generarBorrador";
