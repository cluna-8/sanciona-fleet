/** Único módulo que conoce Supabase para notifications. SPEC.md §7.1
 * (notifications-service). */
import { supabase } from "@/integrations/supabase/client";

export type Aviso = {
  id: string;
  sanction_id: string | null;
  notification_type: string;
  title: string;
  body: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

export async function fetchAvisos(orgId: string, soloNoLeidos = false): Promise<Aviso[]> {
  let consulta = supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (soloNoLeidos) consulta = consulta.is("read_at", null);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as Aviso[];
}

export async function marcarAvisosLeidos(orgId: string, id: string | null): Promise<void> {
  let consulta = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("organization_id", orgId);
  consulta = id ? consulta.eq("id", id) : consulta.is("read_at", null);
  const { error } = await consulta;
  if (error) throw error;
}
