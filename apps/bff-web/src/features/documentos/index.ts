export { useDocumentosOrganizacion, useDocumentosSancion } from "./api/queries";
export { documentosKeys } from "./api/keys";
export {
  subirDocumento,
  registrarDocumento,
  enlaceDescarga,
  rutaDocumento,
  BUCKET_DOCUMENTOS,
  type NuevoDocumento,
  type DocumentoFila,
} from "./api/client";
export type { DocumentoSancion } from "@sanciona/contracts";
