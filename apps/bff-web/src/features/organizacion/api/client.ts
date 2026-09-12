/** Único módulo que conoce Supabase para organizations / organization_members
 * / organization_invitations / profiles. Ver SPEC.md §7.1 (identity-service)
 * y el plan de refactor §2. */
import { supabase } from "@/integrations/supabase/client";
import type { Organizacion, SesionEmpresa, Rol } from "@sanciona/contracts";

export async function fetchSesion(): Promise<SesionEmpresa | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: miembro, error }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organization_id, organizations(*)")
      .eq("user_id", user.id)
      .eq("status", "activo")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw error;

  return {
    userId: user.id,
    email: perfil?.email ?? user.email ?? null,
    fullName: perfil?.full_name ?? null,
    role: (miembro?.role as Rol | undefined) ?? null,
    organization: (miembro?.organizations as Organizacion | null) ?? null,
  };
}

export async function asegurarOrganizacionActiva(): Promise<boolean> {
  const { data, error } = await supabase.rpc("ensure_active_organization");
  return !error && Boolean(data);
}

export async function esSuperadministrador(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return Boolean(data);
}

export type NuevaOrganizacion = {
  name: string;
  cif: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export async function crearOrganizacion(datos: NuevaOrganizacion): Promise<string> {
  const { data: org, error } = await supabase
    .from("organizations")
    .insert(datos as never)
    .select("id")
    .single();
  if (error || !org) throw new Error(error?.message ?? "No se ha podido crear la empresa");
  return (org as { id: string }).id;
}

export async function altaMiembroAdmin(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: userId,
    role: "admin_empresa",
    status: "activo",
  } as never);
  if (error) throw error;
}

export type CambiosOrganizacion = {
  name: string;
  cif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export async function actualizarOrganizacion(
  id: string,
  cambios: CambiosOrganizacion,
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update(cambios as never)
    .eq("id", id);
  if (error) throw error;
}

export type Miembro = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

export async function fetchMiembros(orgId: string): Promise<Miembro[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at");
  if (error) throw error;
  const filas = (data ?? []) as Miembro[];
  const ids = filas.map((m) => m.user_id);
  if (ids.length) {
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const mapa = new Map((perfiles ?? []).map((p) => [p.id, p]));
    for (const m of filas) {
      const p = mapa.get(m.user_id);
      m.profiles = p ? { full_name: p.full_name, email: p.email } : null;
    }
  }
  return filas;
}

export async function cambiarRolMiembro(id: string, rol: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .update({ role: rol } as never)
    .eq("id", id);
  if (error) throw error;
}

export type Invitacion = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
};

export async function fetchInvitaciones(orgId: string): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, email, full_name, role, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Invitacion[];
}

export type NuevaInvitacion = {
  organization_id: string;
  email: string;
  full_name: string;
  role: string;
  invited_by: string;
};

export async function crearInvitacion(datos: NuevaInvitacion): Promise<void> {
  const { error } = await supabase.from("organization_invitations").insert(datos as never);
  if (error) throw error;
}

export async function eliminarInvitacion(id: string): Promise<void> {
  const { error } = await supabase.from("organization_invitations").delete().eq("id", id);
  if (error) throw error;
}
