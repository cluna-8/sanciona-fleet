import type { ClienteSupabase } from "@/features/plazos/api/guardarPlazos";

/**
 * Helper de servidor compartido: crea los avisos (notificaciones) al
 * registrar un expediente desde una extracción. NO es un `createServerFn` —
 * importada por el server fn `crearExpedienteDesdeExtraccion`. Ver nota en
 * `features/plazos/api/guardarPlazos.ts` sobre por qué no se reexporta por
 * barrel.
 */

export async function crearAvisos(
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
