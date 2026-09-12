import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntradaPlazos } from "@/lib/plazos";
import { calcularPlazosRemoto } from "@/lib/deadlines-client.server";
import { parseImporte } from "@/lib/fleet";
import {
  SISTEMA_ANALISIS,
  SISTEMA_BORRADOR,
  SISTEMA_EXTRACCION,
  MODELO_ANALISIS,
  MODELO_EXTRACCION,
  aBloqueArchivo,
  bufferABase64,
  extraerJson,
  llamarModelo,
} from "@/lib/expediente.server";

type ValorCampo = string | number | boolean | null;
type Campo = { valor: ValorCampo; confianza: string; fuente: string | null };
type Campos = Record<string, Campo>;

const CONFIANZAS = new Set(["Alto", "Medio", "Bajo"]);

function normalizarMatricula(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function texto(campos: Campos, clave: string): string | null {
  const v = campos[clave]?.valor;
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function numero(campos: Campos, clave: string): number | null {
  return parseImporte(campos[clave]?.valor);
}

function fecha(campos: Campos, clave: string): string | null {
  const v = texto(campos, clave);
  if (!v) return null;
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function booleano(campos: Campos, clave: string): boolean {
  const v = campos[clave]?.valor;
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "sí" || s === "si";
}

/* ------------------------------------------------------------------ */
/* 1. Procesar documento: lectura automática + extracción estructurada */
/* ------------------------------------------------------------------ */

export const procesarDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { extractionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: extraccion, error } = await supabase
      .from("sanction_extractions")
      .select("*")
      .eq("id", data.extractionId)
      .single();
    if (error || !extraccion) throw new Error("No se ha encontrado el documento a procesar.");

    await supabase
      .from("sanction_extractions")
      .update({ status: "Procesando documento" })
      .eq("id", extraccion.id);

    try {
      const { data: archivo, error: errorDescarga } = await supabase.storage
        .from("sanction-documents")
        .download(extraccion.file_path);
      if (errorDescarga || !archivo) throw new Error("No ha sido posible acceder al documento almacenado.");

      const buffer = await archivo.arrayBuffer();
      if (buffer.byteLength === 0) throw new Error("El documento está vacío.");
      const mime = extraccion.mime_type || archivo.type || "application/pdf";
      const base64 = bufferABase64(buffer);

      const respuesta = await llamarModelo({
        modelo: MODELO_EXTRACCION,
        sistema: SISTEMA_EXTRACCION,
        jsonEstricto: true,
        bloques: [
          {
            type: "text",
            text: "Extrae los datos del siguiente expediente sancionador. Devuelve solo el JSON indicado.",
          },
          aBloqueArchivo(extraccion.file_name, mime, base64),
        ],
      });

      const salida = extraerJson<{
        texto_documento?: string;
        ocr_utilizado?: boolean;
        campos?: Record<string, { valor?: unknown; confianza?: string; fuente?: string | null }>;
        avisos?: string[];
      }>(respuesta.contenido);

      const campos: Campos = {};
      const confianzas: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(salida.campos ?? {})) {
        if (!valor || typeof valor !== "object") continue;
        const bruto = (valor as { valor?: unknown }).valor;
        if (bruto === null || bruto === undefined || bruto === "") continue;
        const normalizado: ValorCampo =
          typeof bruto === "number" || typeof bruto === "boolean" ? bruto : String(bruto);
        const confianza = CONFIANZAS.has(String(valor.confianza)) ? String(valor.confianza) : "Bajo";
        campos[clave] = { valor: normalizado, confianza, fuente: valor.fuente ?? null };
        confianzas[clave] = confianza;
      }

      // Asociación automática de vehículo y conductor
      const matricula = normalizarMatricula(campos["matricula"]?.valor);
      let vehicleId: string | null = null;
      let vehiculoTexto: string | null = null;
      if (matricula) {
        const { data: vehiculos } = await supabase
          .from("vehicles")
          .select("id, registration_number")
          .eq("organization_id", extraccion.organization_id);
        const encontrado = (vehiculos ?? []).find(
          (v) => normalizarMatricula(v.registration_number) === matricula,
        );
        vehicleId = encontrado?.id ?? null;
        vehiculoTexto = encontrado?.registration_number ?? null;
      }

      const nombreConductor = String(campos["conductor_nombre"]?.valor ?? "").trim().toLowerCase();
      let driverId: string | null = null;
      let conductorTexto: string | null = null;
      if (nombreConductor) {
        const { data: conductores } = await supabase
          .from("drivers")
          .select("id, full_name, identification_number")
          .eq("organization_id", extraccion.organization_id);
        const dni = String(campos["conductor_dni"]?.valor ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const encontrado = (conductores ?? []).find(
          (c) =>
            c.full_name.trim().toLowerCase() === nombreConductor ||
            (!!dni &&
              (c.identification_number ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() === dni),
        );
        driverId = encontrado?.id ?? null;
        conductorTexto = encontrado?.full_name ?? null;
      }

      const avisos: string[] = [...(salida.avisos ?? []).map(String)];
      if (matricula && !vehicleId) avisos.push("Vehículo no localizado en la flota registrada.");
      if (!nombreConductor) avisos.push("Conductor pendiente de identificar.");

      const camposDudosos = Object.entries(confianzas).filter(([, c]) => c === "Bajo").length;
      const estado = camposDudosos > 0 || avisos.length > 0 ? "Revisión requerida" : "Información extraída";

      await supabase
        .from("sanction_extractions")
        .update({
          status: estado,
          ocr_used: Boolean(salida.ocr_utilizado),
          raw_text: (salida.texto_documento ?? "").slice(0, 100000),
          fields: campos as never,
          confidence: confianzas as never,
          warnings: avisos as never,
          model: respuesta.modelo,
          error_message: null,
        })
        .eq("id", extraccion.id);

      await supabase.from("activity_logs").insert({
        organization_id: extraccion.organization_id,
        user_id: userId,
        entity_type: "extraccion",
        entity_id: extraccion.id,
        action: "Extracción documental",
        details: `Documento ${extraccion.file_name} procesado (${estado.toLowerCase()}).`,
      } as never);

      return {
        estado,
        campos,
        avisos,
        ocr: Boolean(salida.ocr_utilizado),
        sugerencias: { vehicleId, vehiculoTexto, driverId, conductorTexto },
      };
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error al procesar el documento.";
      await supabase
        .from("sanction_extractions")
        .update({ status: "Error de procesamiento", error_message: mensaje })
        .eq("id", extraccion.id);
      throw new Error(mensaje);
    }
  });

/* ------------------------------------------------------------------ */
/* 2. Crear el expediente a partir de la extracción revisada           */
/* ------------------------------------------------------------------ */

export const crearExpedienteDesdeExtraccion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      extractionId: string;
      campos: Campos;
      vehicleId: string | null;
      driverId: string | null;
      documentType: string;
      discrepancias?: string[];
      confirmadoPorUsuario?: boolean;
      camposCorregidos?: string[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const campos = data.campos ?? {};

    const { data: extraccion, error } = await supabase
      .from("sanction_extractions")
      .select("*")
      .eq("id", data.extractionId)
      .single();
    if (error || !extraccion) throw new Error("No se ha encontrado la extracción del documento.");

    const orgId = extraccion.organization_id;
    const referencia =
      texto(campos, "numero_expediente") ||
      texto(campos, "numero_denuncia") ||
      texto(campos, "referencia") ||
      `SIN-REF-${Date.now()}`;

    const requiereIdentificacion =
      booleano(campos, "requiere_identificacion_conductor") || !data.driverId;

    const { data: sancion, error: errorInsert } = await supabase
      .from("sanctions")
      .insert({
        organization_id: orgId,
        reference_number: referencia,
        sanctioning_authority: texto(campos, "organismo"),
        sanction_category: texto(campos, "categoria") ?? "Otra",
        description: texto(campos, "descripcion") ?? texto(campos, "tipo_infraccion"),
        violation_date: fecha(campos, "fecha_infraccion"),
        notification_date: fecha(campos, "fecha_notificacion"),
        payment_deadline: fecha(campos, "fecha_limite_pago_reducido"),
        appeal_deadline: fecha(campos, "fecha_limite_alegaciones"),
        original_amount: numero(campos, "importe_original") ?? 0,
        discounted_amount: numero(campos, "importe_reducido"),
        points: numero(campos, "puntos") ?? 0,
        vehicle_id: data.vehicleId,
        driver_id: data.driverId,
        status: requiereIdentificacion ? "Pendiente de identificación del conductor" : "Nueva",
        priority: "Normal",
        infraction_time: texto(campos, "hora_infraccion"),
        location: texto(campos, "lugar"),
        road: texto(campos, "carretera"),
        kilometer_point: texto(campos, "punto_kilometrico"),
        municipality: texto(campos, "municipio"),
        province: texto(campos, "provincia"),
        legal_norm: texto(campos, "norma"),
        legal_article: texto(campos, "articulo"),
        legal_section: texto(campos, "apartado"),
        qualification: texto(campos, "calificacion"),
        reported_facts: texto(campos, "hechos_imputados"),
        surcharge_amount: numero(campos, "recargo"),
        discount_percentage: numero(campos, "porcentaje_reduccion"),
        requires_driver_identification: requiereIdentificacion,
        driver_identification_deadline: fecha(campos, "plazo_identificacion"),
        denouncing_agent: texto(campos, "agente_denunciante"),
        evidence_mentioned: texto(campos, "pruebas_mencionadas"),
        complaint_date: fecha(campos, "fecha_denuncia"),
        issue_date: fecha(campos, "fecha_emision"),
        reception_date: fecha(campos, "fecha_recepcion"),
        analysis_status: "Información extraída",
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (errorInsert || !sancion) throw new Error(errorInsert?.message ?? "No se ha podido crear el expediente.");

    const { data: documento } = await supabase
      .from("sanction_documents")
      .insert({
        organization_id: orgId,
        sanction_id: sancion.id,
        document_type: data.documentType || "Notificación de la sanción",
        file_name: extraccion.file_name,
        file_path: extraccion.file_path,
        uploaded_by: userId,
      } as never)
      .select("id")
      .single();

    await supabase
      .from("sanction_extractions")
      .update({
        sanction_id: sancion.id,
        document_id: documento?.id ?? null,
        fields: campos as never,
      })
      .eq("id", extraccion.id);

    const corregidos = (data.camposCorregidos ?? []).filter(Boolean);
    const discrepancias = (data.discrepancias ?? []).filter(Boolean);

    const actuaciones: Array<Record<string, unknown>> = [
      {
        organization_id: orgId,
        sanction_id: sancion.id,
        action_type: "Registro del expediente",
        description: `Expediente ${referencia} creado a partir del documento ${extraccion.file_name}.`,
        performed_by: userId,
      },
      {
        organization_id: orgId,
        sanction_id: sancion.id,
        action_type: "Extracción documental",
        description: "Datos extraídos automáticamente del documento y revisados por el usuario.",
        performed_by: userId,
      },
    ];

    if (corregidos.length) {
      actuaciones.push({
        organization_id: orgId,
        sanction_id: sancion.id,
        action_type: "Corrección manual de datos",
        description: `Datos corregidos manualmente antes de crear el expediente: ${corregidos.join(", ")}.`,
        performed_by: userId,
      });
    }

    if (discrepancias.length) {
      actuaciones.push({
        organization_id: orgId,
        sanction_id: sancion.id,
        action_type: "Discrepancias detectadas",
        description: discrepancias.join(" | "),
        performed_by: userId,
      });
      if (data.confirmadoPorUsuario) {
        actuaciones.push({
          organization_id: orgId,
          sanction_id: sancion.id,
          action_type: "Confirmación del usuario",
          description:
            "El usuario ha confirmado expresamente continuar con la creación del expediente pese a las discrepancias detectadas.",
          performed_by: userId,
        });
      }
    }

    await supabase.from("sanction_actions").insert(actuaciones as never);

    if (discrepancias.length) {
      await supabase.from("activity_logs").insert({
        organization_id: orgId,
        user_id: userId,
        entity_type: "sancion",
        entity_id: sancion.id,
        action: "Discrepancias en la extracción",
        details: discrepancias.join(" | "),
      } as never);
    }

    await guardarPlazos(supabase, orgId, sancion.id, {
      notification_date: fecha(campos, "fecha_notificacion"),
      reception_date: fecha(campos, "fecha_recepcion"),
      issue_date: fecha(campos, "fecha_emision"),
      sanctioning_authority: texto(campos, "organismo"),
      sanction_category: texto(campos, "categoria"),
      requires_driver_identification: requiereIdentificacion,
      payment_deadline: fecha(campos, "fecha_limite_pago_reducido"),
      appeal_deadline: fecha(campos, "fecha_limite_alegaciones"),
      driver_identification_deadline: fecha(campos, "plazo_identificacion"),
    });

    await crearAvisos(supabase, orgId, sancion.id, referencia, requiereIdentificacion);

    return { sanctionId: sancion.id as string };
  });

/* ------------------------------------------------------------------ */
/* 3. Análisis del expediente                                          */
/* ------------------------------------------------------------------ */

export const analizarExpediente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sanctionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sancion, error } = await supabase
      .from("sanctions")
      .select("*, vehicles(registration_number, brand, model), drivers(full_name, identification_number)")
      .eq("id", data.sanctionId)
      .single();
    if (error || !sancion) throw new Error("No se ha encontrado el expediente.");

    const orgId = sancion.organization_id;

    const [{ data: documentos }, { data: extracciones }, { data: fuentes }] = await Promise.all([
      supabase.from("sanction_documents").select("document_type, file_name").eq("sanction_id", sancion.id),
      supabase
        .from("sanction_extractions")
        .select("raw_text, fields, warnings, confidence")
        .eq("sanction_id", sancion.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("legal_sources").select("norm, article, section, summary, official_url, version_date"),
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
        lugar: [sancion.location, sancion.road, sancion.kilometer_point, sancion.municipality, sancion.province]
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

/* ------------------------------------------------------------------ */
/* 4. Generación de borradores                                         */
/* ------------------------------------------------------------------ */

export const generarBorrador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sanctionId: string; kind: "Alegaciones" | "Recurso" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sancion, error } = await supabase
      .from("sanctions")
      .select("*, vehicles(registration_number), drivers(full_name, identification_number), organizations(name, cif, address, city, postal_code, province)")
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
      supabase.from("sanction_documents").select("document_type, file_name").eq("sanction_id", sancion.id),
    ]);

    const listaFuentes = (fuentes ?? [])
      .map((f) => `- ${f.norm}${f.article ? `, ${f.article}` : ""}${f.section ? ` (${f.section})` : ""}`)
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
    if (errorBorrador || !borrador) throw new Error(errorBorrador?.message ?? "No se ha podido crear el borrador.");

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
      action_type: data.kind === "Alegaciones" ? "Presentación de alegaciones" : "Presentación de recurso",
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

/* ------------------------------------------------------------------ */
/* 5. Recalcular plazos manualmente                                    */
/* ------------------------------------------------------------------ */

export const recalcularPlazos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sanctionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: s, error } = await supabase
      .from("sanctions")
      .select("*")
      .eq("id", data.sanctionId)
      .single();
    if (error || !s) throw new Error("No se ha encontrado el expediente.");
    const plazos = await guardarPlazos(supabase, s.organization_id, s.id, {
      notification_date: s.notification_date,
      reception_date: s.reception_date,
      issue_date: s.issue_date,
      sanctioning_authority: s.sanctioning_authority,
      sanction_category: s.sanction_category,
      requires_driver_identification: s.requires_driver_identification,
      payment_deadline: s.payment_deadline,
      appeal_deadline: s.appeal_deadline,
      driver_identification_deadline: s.driver_identification_deadline,
    });
    return { plazos };
  });

/* ------------------------------------------------------------------ */
/* Helpers de servidor                                                 */
/* ------------------------------------------------------------------ */

type ClienteSupabase = { from: (t: string) => any };

async function guardarPlazos(
  supabase: ClienteSupabase,
  orgId: string,
  sanctionId: string,
  entrada: EntradaPlazos,
) {
  const plazos = await calcularPlazosRemoto(sanctionId, entrada);
  if (plazos.length === 0) return plazos;
  await supabase
    .from("sanction_deadlines")
    .upsert(
      plazos.map((p) => ({
        organization_id: orgId,
        sanction_id: sanctionId,
        deadline_type: p.deadline_type,
        start_date: p.start_date,
        end_date: p.end_date,
        document_date: p.document_date,
        calculation_basis: p.calculation_basis,
        day_type: p.day_type,
        source: p.source,
        status: p.status,
        notes: p.notes,
        last_verified_at: new Date().toISOString(),
      })),
      { onConflict: "sanction_id,deadline_type" },
    );
  return plazos;
}

async function crearAvisos(
  supabase: ClienteSupabase,
  orgId: string,
  sanctionId: string,
  referencia: string,
  requiereIdentificacion: boolean,
) {
  const avisos = [
    {
      organization_id: orgId,
      sanction_id: sanctionId,
      notification_type: "Documento procesado",
      title: `Documento procesado · ${referencia}`,
      body: "La información del documento se ha incorporado al expediente.",
      severity: "info",
    },
  ];
  if (requiereIdentificacion) {
    avisos.push({
      organization_id: orgId,
      sanction_id: sanctionId,
      notification_type: "Conductor pendiente",
      title: `Conductor pendiente de identificar · ${referencia}`,
      body: "El expediente requiere identificar al conductor responsable.",
      severity: "alta",
    });
  }
  await supabase.from("notifications").insert(avisos);
}
