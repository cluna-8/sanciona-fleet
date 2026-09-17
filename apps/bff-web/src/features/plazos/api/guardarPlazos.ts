import type { EntradaPlazos } from "@/lib/plazos";
import { calcularPlazosRemoto } from "@/lib/deadlines-client.server";

/**
 * Helper de servidor compartido: calcula y persiste los plazos de un
 * expediente. NO es un `createServerFn` — es una función de servidor pura
 * importada por los server fns de extracción, análisis y plazos.
 *
 * Vive en `api/` (no en un directorio `server/`) porque la import-protection
 * de vite bloquea las rutas bajo `server/` en el grafo cliente, y los server
 * fns que la consumen sí están en el grafo cliente vía `useServerFn`. NO se
 * reexporta por el barrel `features/plazos/index.ts`: hacerlo la haría
 * alcanzable desde el cliente y arrastraría `deadlines-client.server` al
 * bundle cliente.
 */

export type ClienteSupabase = Pick<
  import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>,
  "from"
>;

export async function guardarPlazos(
  supabase: ClienteSupabase,
  orgId: string,
  sanctionId: string,
  entrada: EntradaPlazos,
) {
  const plazos = await calcularPlazosRemoto(sanctionId, entrada);
  if (plazos.length === 0) return plazos;
  await supabase.from("sanction_deadlines").upsert(
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
