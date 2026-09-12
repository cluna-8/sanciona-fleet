/** Único módulo que conoce Supabase para sanction_extractions y el bucket de
 * entrada. La extracción en sí (IA) es un server fn — SPEC.md §7.1
 * (extraction-service). */
import { supabase } from "@/integrations/supabase/client";

export type Extraccion = {
  id: string;
  status: string;
  ocr_used: boolean;
  file_name: string;
  fields: Record<
    string,
    { valor: string | number | boolean | null; confianza: string; fuente?: string | null }
  >;
  confidence: Record<string, string>;
  warnings: string[];
  created_at: string;
};

export async function fetchExtraccion(sanctionId: string): Promise<Extraccion | null> {
  const { data, error } = await supabase
    .from("sanction_extractions")
    .select("id, status, ocr_used, file_name, fields, confidence, warnings, created_at")
    .eq("sanction_id", sanctionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Extraccion | null) ?? null;
}

export async function subirDocumentoEntrada(ruta: string, archivo: File): Promise<void> {
  const { error } = await supabase.storage
    .from("sanction-documents")
    .upload(ruta, archivo, archivo.type ? { contentType: archivo.type } : {});
  if (error) throw error;
}

export function rutaEntrada(orgId: string, nombreArchivo: string): string {
  const limpio = nombreArchivo.replace(/[^\w.-]/g, "_");
  return `${orgId}/entrada/${Date.now()}-${limpio}`;
}

export async function crearRegistroExtraccion(datos: {
  organization_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  created_by: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("sanction_extractions")
    .insert({ ...datos, status: "Documento recibido" } as never)
    .select("id")
    .single();
  if (error || !data) {
    if (error?.message?.toLowerCase().includes("row-level security")) {
      throw new Error(
        "No tienes permisos sobre esta empresa para registrar documentos. Comprueba que tu usuario sigue activo en la empresa.",
      );
    }
    throw error ?? new Error("No se ha podido registrar el documento");
  }
  return (data as { id: string }).id;
}
