/** Único módulo que conoce Supabase Storage / sanction_documents. Ver
 * SPEC.md §7.1 (documents-service) y el plan de refactor §2. */
import { supabase } from "@/integrations/supabase/client";
import type { DocumentoSancion } from "@sanciona/contracts";

export const BUCKET_DOCUMENTOS = "sanction-documents";

export type DocumentoFila = DocumentoSancion & {
  sanction_id: string;
  document_type: string | null;
  sanctions?: { reference_number: string } | null;
};

export async function fetchDocumentosOrganizacion(orgId: string): Promise<DocumentoFila[]> {
  const { data, error } = await supabase
    .from("sanction_documents")
    .select(
      "id, document_type, file_name, file_path, created_at, sanction_id, sanctions(reference_number)",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DocumentoFila[];
}

export async function fetchDocumentosSancion(sanctionId: string): Promise<DocumentoSancion[]> {
  const { data, error } = await supabase
    .from("sanction_documents")
    .select("id, document_type, file_name, file_path, created_at")
    .eq("sanction_id", sanctionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentoSancion[];
}

export async function subirDocumento(ruta: string, archivo: File): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(ruta, archivo);
  if (error) throw error;
}

export type NuevoDocumento = {
  organization_id: string;
  sanction_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
};

export async function registrarDocumento(datos: NuevoDocumento): Promise<void> {
  const { error } = await supabase.from("sanction_documents").insert(datos as never);
  if (error) throw error;
}

/** Enlace de descarga temporal (60 s). Devuelve null si Storage falla. */
export async function enlaceDescarga(ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(ruta, 60);
  if (error) {
    console.error("[documentos] enlaceDescarga: fallo generando signedUrl", {
      ruta,
      message: error.message,
    });
    return null;
  }
  if (!data?.signedUrl) {
    console.error("[documentos] enlaceDescarga: respuesta sin signedUrl", { ruta });
    return null;
  }
  return data.signedUrl;
}

export function rutaDocumento(orgId: string, sanctionId: string, nombreArchivo: string): string {
  const limpio = nombreArchivo.replace(/[^\w.-]/g, "_");
  return `${orgId}/${sanctionId}/${Date.now()}-${limpio}`;
}
