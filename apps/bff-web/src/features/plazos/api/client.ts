/** Único módulo que conoce Supabase para sanction_deadlines. El cálculo en
 * sí vive en services/deadlines-service (Worker, ya extraído — SPEC.md §7.1);
 * esto solo lee lo que ese servicio ya guardó. */
import { supabase } from "@/integrations/supabase/client";

export type Plazo = {
  id: string;
  deadline_type: string;
  start_date: string | null;
  end_date: string | null;
  document_date: string | null;
  calculation_basis: string | null;
  day_type: string;
  source: string;
  status: string;
  notes: string | null;
  last_verified_at: string;
};

export async function fetchPlazos(sanctionId: string): Promise<Plazo[]> {
  const { data, error } = await supabase
    .from("sanction_deadlines")
    .select("*")
    .eq("sanction_id", sanctionId)
    .order("end_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Plazo[];
}
