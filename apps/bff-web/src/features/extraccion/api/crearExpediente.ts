import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { texto, numero, fecha, booleano, type Campos } from "../model/campos";
import { guardarPlazos } from "@/features/plazos/api/guardarPlazos";
import { crearAvisos } from "@/features/avisos/api/crearAvisos";

/**
 * 2. Crear el expediente a partir de la extracción revisada.
 * Movido (move-only) de `lib/expediente.functions.ts` — Etapa 3.8.
 */
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
    if (errorInsert || !sancion)
      throw new Error(errorInsert?.message ?? "No se ha podido crear el expediente.");

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
