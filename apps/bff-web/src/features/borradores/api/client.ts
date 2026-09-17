/** Único módulo que conoce Supabase para sanction_drafts /
 * sanction_draft_versions. La generación en sí es un server fn
 * (features/borradores/api/generarBorrador.ts). SPEC.md §7.1 (drafts-service). */
import { supabase } from "@/integrations/supabase/client";

export type Borrador = {
  id: string;
  sanction_id: string;
  kind: string;
  title: string;
  status: string;
  current_version: number;
  validated_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BorradorConSancion = Borrador & {
  sanctions: { reference_number: string; sanctioning_authority: string | null } | null;
};

export type VersionBorrador = {
  id: string;
  version: number;
  content: string;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
};

export async function fetchBorradores(sanctionId: string): Promise<Borrador[]> {
  const { data, error } = await supabase
    .from("sanction_drafts")
    .select("*")
    .eq("sanction_id", sanctionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Borrador[];
}

export async function fetchBorrador(draftId: string): Promise<BorradorConSancion | null> {
  const { data, error } = await supabase
    .from("sanction_drafts")
    .select("*, sanctions(reference_number, sanctioning_authority)")
    .eq("id", draftId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as BorradorConSancion | null;
}

export async function fetchVersiones(draftId: string): Promise<VersionBorrador[]> {
  const { data, error } = await supabase
    .from("sanction_draft_versions")
    .select("id, version, content, change_note, created_at, created_by")
    .eq("draft_id", draftId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VersionBorrador[];
}

export async function guardarNuevaVersion(datos: {
  organizationId: string | undefined;
  draftId: string;
  sanctionId: string;
  version: number;
  content: string;
  changeNote: string;
  userId: string;
  draftTitle: string;
}): Promise<void> {
  const { error } = await supabase.from("sanction_draft_versions").insert({
    organization_id: datos.organizationId,
    draft_id: datos.draftId,
    version: datos.version,
    content: datos.content,
    change_note: datos.changeNote,
    created_by: datos.userId,
  } as never);
  if (error) throw error;

  const { error: e2 } = await supabase
    .from("sanction_drafts")
    .update({ current_version: datos.version } as never)
    .eq("id", datos.draftId);
  if (e2) throw e2;

  await supabase.from("sanction_actions").insert({
    organization_id: datos.organizationId,
    sanction_id: datos.sanctionId,
    action_type: "Cambio de estado",
    description: `Nueva versión ${datos.version} del escrito «${datos.draftTitle}».`,
    performed_by: datos.userId,
  } as never);
}

export async function cambiarEstadoBorrador(datos: {
  organizationId: string | undefined;
  draftId: string;
  sanctionId: string;
  draftTitle: string;
  userId: string;
  estado: string;
}): Promise<void> {
  const payload: Record<string, unknown> = { status: datos.estado };
  if (datos.estado === "Validado") {
    payload["validated_by"] = datos.userId;
    payload["validated_at"] = new Date().toISOString();
  }
  const { error } = await supabase
    .from("sanction_drafts")
    .update(payload as never)
    .eq("id", datos.draftId);
  if (error) throw error;

  await supabase.from("sanction_actions").insert({
    organization_id: datos.organizationId,
    sanction_id: datos.sanctionId,
    action_type: "Cambio de estado",
    description: `Escrito «${datos.draftTitle}» marcado como ${datos.estado.toLowerCase()}.`,
    performed_by: datos.userId,
  } as never);
}
