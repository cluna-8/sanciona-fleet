export { useExtraccion, extraccionKeys } from "./api/queries";
export { subirDocumentoEntrada, rutaEntrada, crearRegistroExtraccion } from "./api/client";
export type { Extraccion } from "./api/client";
// Server fns (consumidos vía useServerFn desde componentes) — Etapa 3.8
export { procesarDocumento } from "./api/procesarDocumento";
export { crearExpedienteDesdeExtraccion } from "./api/crearExpediente";
// Wizard de alta desde documento (Etapa 3.3)
export { AltaDesdeDocumento } from "./pages/AltaDesdeDocumento";
