/**
 * Server functions de borradores.
 *
 * `exportarBorrador` (RF-BORRADOR-3/4, hallazgo M-1): genera un binario real
 * (PDF con pdf-lib / .docx con docx) a partir de la ÚLTIMA VERSIÓN GUARDADA —
 * nunca del texto sucio del editor —, lo archiva en el bucket privado
 * `sanction-documents` bajo `${orgId}/escritos/` (RLS de Storage ya cubre la
 * carpeta: `sanction_docs_insert`) y devuelve una signed URL de 60 s con
 * `Content-Disposition: attachment` (parámetro `download`), que fuerza la
 * descarga con el nombre correcto.
 *
 * Filtro explícito `organization_id` además del RLS (RS-2, defense in depth).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nombreArchivoEscrito, parsearEscrito, type CabeceraEscrito } from "@/lib/escrito";
import { generarDocxEscrito } from "@/lib/docx-escrito.server";
import { generarPdfEscrito } from "@/lib/pdf-escrito.server";
import { esquemaExportarBorrador, validar } from "@/lib/esquemas-expediente";

/** Bucket privado de documentos (mismo que features/extraccion y features/documentos). */
const BUCKET_ESCRITOS = "sanction-documents";

const MIME_POR_FORMATO = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/** Los embeds de PostgREST llegan con tipos frágiles; se estrechan aquí. */
type BorradorExportar = { id: string; organization_id: string; sanction_id: string; title: string };
type SancionExportar = {
  reference_number: string | null;
  organizations: {
    name: string | null;
    cif: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    province: string | null;
  } | null;
};
type VersionExportar = { id: string; version: number; content: string };

export const exportarBorrador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validar(esquemaExportarBorrador))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: borrador, error } = await supabase
      .from("sanction_drafts")
      .select("id, organization_id, sanction_id, title")
      .eq("id", data.draftId)
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error || !borrador) {
      throw new Error("No se ha encontrado el escrito o no pertenece a tu empresa.");
    }
    const escrito = borrador as unknown as BorradorExportar;

    const { data: sancion } = await supabase
      .from("sanctions")
      .select("reference_number, organizations(name, cif, address, city, postal_code, province)")
      .eq("id", escrito.sanction_id)
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    const org = (sancion as unknown as SancionExportar | null)?.organizations ?? null;
    const direccion =
      [org?.address, org?.postal_code, org?.city, org?.province]
        .filter((trozo): trozo is string => Boolean(trozo))
        .join(", ") || null;

    // Versión explícita o la última guardada. El binario archivado siempre
    // corresponde a una fila de sanction_draft_versions (append-only).
    let consultaVersion = supabase
      .from("sanction_draft_versions")
      .select("id, version, content")
      .eq("draft_id", escrito.id)
      .eq("organization_id", data.organizationId)
      .order("version", { ascending: false })
      .limit(1);
    if (data.versionId) consultaVersion = consultaVersion.eq("id", data.versionId);
    const { data: version, error: errorVersion } = await consultaVersion.maybeSingle();
    if (errorVersion || !version) {
      throw new Error("El escrito todavía no tiene versiones guardadas que exportar.");
    }
    const versionExportar = version as unknown as VersionExportar;

    const cabecera: CabeceraEscrito = {
      organizacion: org?.name ?? null,
      cif: org?.cif ?? null,
      direccion,
      expediente: (sancion as unknown as SancionExportar | null)?.reference_number ?? null,
      fecha: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    };

    const bloques = parsearEscrito(versionExportar.content);
    const archivo = nombreArchivoEscrito(escrito.title, versionExportar.version, data.formato);
    const bytes =
      data.formato === "pdf"
        ? await generarPdfEscrito({ bloques, cabecera, titulo: escrito.title })
        : await generarDocxEscrito({ bloques, cabecera, titulo: escrito.title });

    const ruta = `${data.organizationId}/escritos/${Date.now()}-${archivo}`;
    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_ESCRITOS)
      .upload(ruta, new Blob([new Uint8Array(bytes)], { type: MIME_POR_FORMATO[data.formato] }), {
        contentType: MIME_POR_FORMATO[data.formato],
      });
    if (errorSubida)
      throw new Error("No se ha podido archivar el escrito generado. Inténtalo de nuevo.");

    const { data: firma, error: errorUrl } = await supabase.storage
      .from(BUCKET_ESCRITOS)
      .createSignedUrl(ruta, 60, { download: archivo });
    if (errorUrl || !firma?.signedUrl)
      throw new Error("No se ha podido generar el enlace de descarga.");

    const { error: errorAuditoria } = await supabase.from("sanction_actions").insert({
      organization_id: escrito.organization_id,
      sanction_id: escrito.sanction_id,
      action_type: "Exportación de escrito",
      description: `Escrito «${escrito.title}» exportado como ${data.formato.toUpperCase()} (versión ${versionExportar.version}).`,
      performed_by: userId,
    } as never);
    if (errorAuditoria) throw new Error(errorAuditoria.message);

    return { url: firma.signedUrl, archivo, version: versionExportar.version };
  });
