import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SISTEMA_ANALISIS,
  MODELO_ANALISIS,
  extraerJson,
  llamarModelo,
} from "@/lib/expediente.server";
import { guardarPlazos } from "@/features/plazos/api/guardarPlazos";

/**
 * 3. Análisis del expediente.
 * Movido (move-only) de `lib/expediente.functions.ts` — Etapa 3.8.
 */
export const analizarExpediente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sanctionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sancion, error } = await supabase
      .from("sanctions")
      .select(
        "*, vehicles(registration_number, brand, model), drivers(full_name, identification_number)",
      )
      .eq("id", data.sanctionId)
      .single();
    if (error || !sancion) throw new Error("No se ha encontrado el expediente.");

    const orgId = sancion.organization_id;

    const [{ data: documentos }, { data: extracciones }, { data: fuentes }] = await Promise.all([
      supabase
        .from("sanction_documents")
        .select("document_type, file_name")
        .eq("sanction_id", sancion.id),
      supabase
        .from("sanction_extractions")
        .select("raw_text, fields, warnings, confidence")
        .eq("sanction_id", sancion.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("legal_sources")
        .select("norm, article, section, summary, official_url, version_date"),
    ]);

    const plazos = await guardarPlazos(supabase, orgId, sancion.id, {
      notification_date: sancion.notification_date,
      reception_date: sancion.reception_date,
      issue_date: sancion.issue_date,
      sanctioning_authority: sancion.sanctioning_authority,
      sanction_category: sancion.sanction_category,
      requires_driver_identification: sancion.requires_driver_identification,
      payment_deadline: sancion.payment_deadline,
      appeal_deadline: sancion.appeal_deadline,
      driver_identification_deadline: sancion.driver_identification_deadline,
    });

    const extraccion = extracciones?.[0];
    const contexto = {
      expediente: {
        numero: sancion.reference_number,
        organismo: sancion.sanctioning_authority,
        categoria: sancion.sanction_category,
        descripcion: sancion.description,
        hechos: sancion.reported_facts,
        norma: sancion.legal_norm,
        articulo: sancion.legal_article,
        apartado: sancion.legal_section,
        calificacion: sancion.qualification,
        importe_original: sancion.original_amount,
        importe_reducido: sancion.discounted_amount,
        recargo: sancion.surcharge_amount,
        puntos: sancion.points,
        fecha_infraccion: sancion.violation_date,
        fecha_notificacion: sancion.notification_date,
        lugar: [
          sancion.location,
          sancion.road,
          sancion.kilometer_point,
          sancion.municipality,
          sancion.province,
        ]
          .filter(Boolean)
          .join(", "),
        agente: sancion.denouncing_agent,
        pruebas_mencionadas: sancion.evidence_mentioned,
        requiere_identificacion_conductor: sancion.requires_driver_identification,
        estado: sancion.status,
      },
      vehiculo: sancion.vehicles ?? null,
      conductor: sancion.drivers ?? null,
      documentos_disponibles: (documentos ?? []).map((d) => d.document_type ?? d.file_name),
      plazos_calculados: plazos,
      avisos_extraccion: extraccion?.warnings ?? [],
      confianza_extraccion: extraccion?.confidence ?? {},
      texto_documento: String(extraccion?.raw_text ?? "").slice(0, 30000),
    };

    const listaFuentes = (fuentes ?? [])
      .map(
        (f) =>
          `- ${f.norm}${f.article ? `, ${f.article}` : ""}${f.section ? ` (${f.section})` : ""}: ${f.summary ?? ""} [${f.official_url ?? "sin URL"}]`,
      )
      .join("\n");

    const respuesta = await llamarModelo({
      modelo: MODELO_ANALISIS,
      sistema: SISTEMA_ANALISIS,
      jsonEstricto: true,
      bloques: [
        {
          type: "text",
          text: `FUENTES VERIFICADAS DISPONIBLES:\n${listaFuentes}\n\nEXPEDIENTE:\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
    });

    const salida = extraerJson<Record<string, unknown>>(respuesta.contenido);

    const semaforoValido = ["Verde", "Naranja", "Rojo", "Gris"];
    const semaforo = semaforoValido.includes(String(salida["semaforo"]))
      ? String(salida["semaforo"])
      : "Gris";
    const confianza = ["Alto", "Medio", "Bajo"].includes(String(salida["nivel_confianza"]))
      ? String(salida["nivel_confianza"])
      : "Bajo";

    await supabase.from("sanction_analyses").delete().eq("sanction_id", sancion.id);
    const { data: analisis, error: errorAnalisis } = await supabase
      .from("sanction_analyses")
      .insert({
        organization_id: orgId,
        sanction_id: sancion.id,
        status: "Análisis completado",
        recommendation: String(salida["recomendacion"] ?? "Revisar"),
        rationale: String(salida["motivo"] ?? ""),
        next_step: String(salida["proximo_paso"] ?? ""),
        confidence_level: confianza,
        traffic_light: semaforo,
        factors: (salida["factores"] ?? []) as never,
        checklist: (salida["checklist"] ?? []) as never,
        coherence_issues: (salida["incoherencias"] ?? []) as never,
        procedure_review: (salida["revision_procedimiento"] ?? []) as never,
        evidence_review: (salida["revision_prueba"] ?? []) as never,
        legal_refs: (salida["fuentes"] ?? []) as never,
        model: respuesta.modelo,
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (errorAnalisis) throw new Error(errorAnalisis.message);

    await supabase
      .from("sanctions")
      .update({
        recommended_action: String(salida["recomendacion"] ?? "Revisar"),
        traffic_light: semaforo,
        analysis_status: "Análisis completado",
      } as never)
      .eq("id", sancion.id);

    await supabase.from("sanction_actions").insert({
      organization_id: orgId,
      sanction_id: sancion.id,
      action_type: "Análisis del expediente",
      description: `Análisis completado. Recomendación preliminar: ${String(salida["recomendacion"] ?? "Revisar")}.`,
      performed_by: userId,
    } as never);

    await supabase.from("notifications").insert({
      organization_id: orgId,
      sanction_id: sancion.id,
      notification_type: "Análisis completado",
      title: `Análisis completado · ${sancion.reference_number}`,
      body: `Recomendación preliminar: ${String(salida["recomendacion"] ?? "Revisar")}.`,
      severity: semaforo === "Rojo" ? "alta" : "info",
    } as never);

    return { analysisId: analisis?.id as string };
  });
