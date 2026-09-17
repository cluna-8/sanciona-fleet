import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SISTEMA_EXTRACCION,
  MODELO_EXTRACCION,
  aBloqueArchivo,
  bufferABase64,
  extraerJson,
  llamarModelo,
} from "@/lib/expediente.server";
import { CONFIANZAS, normalizarMatricula, type Campos, type ValorCampo } from "../model/campos";

/**
 * 1. Procesar documento: lectura automática + extracción estructurada.
 * Movido (move-only) de `lib/expediente.functions.ts` — Etapa 3.8.
 */
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
      if (errorDescarga || !archivo)
        throw new Error("No ha sido posible acceder al documento almacenado.");

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
        const confianza = CONFIANZAS.has(String(valor.confianza))
          ? String(valor.confianza)
          : "Bajo";
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

      const nombreConductor = String(campos["conductor_nombre"]?.valor ?? "")
        .trim()
        .toLowerCase();
      let driverId: string | null = null;
      let conductorTexto: string | null = null;
      if (nombreConductor) {
        const { data: conductores } = await supabase
          .from("drivers")
          .select("id, full_name, identification_number")
          .eq("organization_id", extraccion.organization_id);
        const dni = String(campos["conductor_dni"]?.valor ?? "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase();
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
      const estado =
        camposDudosos > 0 || avisos.length > 0 ? "Revisión requerida" : "Información extraída";

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
