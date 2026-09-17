import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guardarPlazos } from "./guardarPlazos";

/**
 * 5. Recalcular plazos manualmente.
 * Movido (move-only) de `lib/expediente.functions.ts` — Etapa 3.8.
 */
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
