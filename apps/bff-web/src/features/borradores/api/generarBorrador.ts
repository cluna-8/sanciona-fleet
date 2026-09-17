import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SISTEMA_BORRADOR, MODELO_ANALISIS, llamarModelo } from "@/lib/expediente.server";

/**
 * 4. Generación de borradores.
 * Movido (move-only) de `lib/expediente.functions.ts` — Etapa 3.8.
 */
export const generarBorrador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sanctionId: string; kind: "Alegaciones" | "Recurso" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sancion, error } = await supabase
      .from("sanctions")
      .select(
        "*, vehicles(registration_number), drivers(full_name, identification_number), organizations(name, cif, address, city, postal_code, province)",
      )
      .eq("id", data.sanctionId)
      .single();
    if (error || !sancion) throw new Error("No se ha encontrado el expediente.");

    const orgId = sancion.organization_id;
    const [{ data: analisis }, { data: fuentes }, { data: documentos }] = await Promise.all([
      supabase
        .from("sanction_analyses")
        .select("*")
        .eq("sanction_id", sancion.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("legal_sources").select("norm, article, section, summary, official_url"),
      supabase
        .from("sanction_documents")
        .select("document_type, file_name")
        .eq("sanction_id", sancion.id),
    ]);

    const listaFuentes = (fuentes ?? [])
      .map(
        (f) =>
          `- ${f.norm}${f.article ? `, ${f.article}` : ""}${f.section ? ` (${f.section})` : ""}`,
      )
      .join("\n");

    const respuesta = await llamarModelo({
      modelo: MODELO_ANALISIS,
      sistema: SISTEMA_BORRADOR,
      bloques: [
        {
          type: "text",
          text: `TIPO DE ESCRITO: ${data.kind}\n\nFUENTES VERIFICADAS:\n${listaFuentes}\n\nEXPEDIENTE:\n${JSON.stringify(
            {
              expediente: sancion.reference_number,
              organismo: sancion.sanctioning_authority,
              empresa: sancion.organizations,
              vehiculo: sancion.vehicles,
              conductor: sancion.drivers,
              hechos: sancion.reported_facts ?? sancion.description,
              norma: sancion.legal_norm,
              articulo: sancion.legal_article,
              apartado: sancion.legal_section,
              importe: sancion.original_amount,
              fecha_infraccion: sancion.violation_date,
              fecha_notificacion: sancion.notification_date,
              lugar: [sancion.location, sancion.road, sancion.municipality, sancion.province]
                .filter(Boolean)
                .join(", "),
              documentos: (documentos ?? []).map((d) => d.document_type ?? d.file_name),
              analisis: analisis?.[0]
                ? {
                    motivo: analisis[0].rationale,
                    factores: analisis[0].factors,
                    incoherencias: analisis[0].coherence_issues,
                    revision_prueba: analisis[0].evidence_review,
                  }
                : null,
            },
            null,
            2,
          )}`,
        },
      ],
    });

    const { data: borrador, error: errorBorrador } = await supabase
      .from("sanction_drafts")
      .insert({
        organization_id: orgId,
        sanction_id: sancion.id,
        kind: data.kind,
        title: `${data.kind} · expediente ${sancion.reference_number}`,
        status: "Borrador",
        current_version: 1,
        legal_refs: (analisis?.[0]?.legal_refs ?? []) as never,
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (errorBorrador || !borrador)
      throw new Error(errorBorrador?.message ?? "No se ha podido crear el borrador.");

    await supabase.from("sanction_draft_versions").insert({
      organization_id: orgId,
      draft_id: borrador.id,
      version: 1,
      content: respuesta.contenido,
      change_note: "Versión inicial generada a partir de los datos del expediente.",
      created_by: userId,
    } as never);

    await supabase.from("sanction_actions").insert({
      organization_id: orgId,
      sanction_id: sancion.id,
      action_type:
        data.kind === "Alegaciones" ? "Presentación de alegaciones" : "Presentación de recurso",
      description: `Borrador de ${data.kind.toLowerCase()} generado. Pendiente de validación.`,
      performed_by: userId,
    } as never);

    await supabase.from("notifications").insert({
      organization_id: orgId,
      sanction_id: sancion.id,
      notification_type: "Borrador pendiente de revisión",
      title: `Borrador de ${data.kind.toLowerCase()} · ${sancion.reference_number}`,
      body: "Se ha generado un borrador que requiere revisión y validación.",
      severity: "info",
    } as never);

    return { draftId: borrador.id as string };
  });
