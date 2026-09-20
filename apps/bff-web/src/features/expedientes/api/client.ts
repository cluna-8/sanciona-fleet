/** Único módulo que conoce Supabase para sanctions / sanction_actions /
 * sanction_comments. Ver SPEC.md §7.1 (sanctions-service) y el plan de
 * refactor §2. */
import { supabase } from "@/integrations/supabase/client";
import type { Sancion, Actuacion, Comentario } from "@sanciona/contracts";

export async function fetchSanciones(orgId: string): Promise<Sancion[]> {
  const { data, error } = await supabase
    .from("sanctions")
    .select("*, vehicles(registration_number), drivers(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Sancion[];
}

export async function fetchSancion(id: string, orgId?: string): Promise<Sancion | null> {
  let q = supabase
    .from("sanctions")
    .select("*, vehicles(registration_number), drivers(full_name)")
    .eq("id", id);
  if (orgId) q = q.eq("organization_id", orgId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data as unknown as Sancion | null;
}

export async function fetchActuaciones(sanctionId: string, orgId?: string): Promise<Actuacion[]> {
  let q = supabase
    .from("sanction_actions")
    .select("id, action_type, description, created_at")
    .eq("sanction_id", sanctionId);
  if (orgId) q = q.eq("organization_id", orgId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Actuacion[];
}

export async function fetchComentarios(sanctionId: string, orgId?: string): Promise<Comentario[]> {
  let q = supabase
    .from("sanction_comments")
    .select("id, comment, created_at, created_by")
    .eq("sanction_id", sanctionId);
  if (orgId) q = q.eq("organization_id", orgId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Comentario[];
}

export async function cambiarEstadoSancion(
  id: string,
  orgId: string,
  userId: string,
  nuevo: string,
): Promise<void> {
  const { error } = await supabase
    .from("sanctions")
    .update({ status: nuevo } as never)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  const { error: eAudit } = await supabase.from("sanction_actions").insert({
    organization_id: orgId,
    sanction_id: id,
    action_type: "Cambio de estado",
    description: `Estado actualizado a «${nuevo}».`,
    performed_by: userId,
  } as never);
  if (eAudit) throw eAudit;
}

export async function añadirComentario(
  orgId: string,
  sanctionId: string,
  userId: string,
  texto: string,
): Promise<void> {
  const { error } = await supabase.from("sanction_comments").insert({
    organization_id: orgId,
    sanction_id: sanctionId,
    comment: texto,
    created_by: userId,
  } as never);
  if (error) throw error;
}

export async function registrarActuacion(
  orgId: string,
  sanctionId: string,
  userId: string,
  actionType: string,
  description: string,
): Promise<void> {
  const { error } = await supabase.from("sanction_actions").insert({
    organization_id: orgId,
    sanction_id: sanctionId,
    action_type: actionType,
    description,
    performed_by: userId,
  } as never);
  if (error) throw error;
}

export type NuevaSancion = {
  organization_id: string;
  reference_number: string;
  sanctioning_authority: string;
  sanction_category: string;
  description: string | null;
  violation_date: string | null;
  notification_date: string | null;
  payment_deadline: string | null;
  appeal_deadline: string | null;
  original_amount: number;
  discounted_amount: number | null;
  points: number | null;
  vehicle_id: string | null;
  driver_id: string | null;
  status: string;
  priority: string;
  notes: string | null;
  created_by: string;
};

export async function crearSancionManual(datos: NuevaSancion): Promise<string> {
  const { data: sancion, error } = await supabase
    .from("sanctions")
    .insert(datos as never)
    .select("id")
    .single();
  if (error) throw error;
  return (sancion as { id: string }).id;
}
