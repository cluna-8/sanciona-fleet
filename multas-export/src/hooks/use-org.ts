import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "@/lib/fleet";

export type Organizacion = {
  id: string;
  name: string;
  cif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;

  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
};

export type SesionEmpresa = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Rol | null;
  organization: Organizacion | null;
};

export function useSesion() {
  return useQuery<SesionEmpresa | null>({
    queryKey: ["sesion-empresa"],
    staleTime: 30_000,
    queryFn: async () => {
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
    },
  });
}

/**
 * Garantiza que el usuario autenticado tenga una empresa activa.
 * Si no la tiene, intenta asignarle una automáticamente y, si no es posible,
 * le lleva al proceso de alta/selección de empresa en lugar de bloquearle.
 */
export function useEmpresaActiva() {
  const { data: sesion, isLoading } = useSesion();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const intentado = useRef(false);

  useEffect(() => {
    if (isLoading || !sesion || sesion.organization || intentado.current) return;
    intentado.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("ensure_active_organization");
      if (!error && data) {
        await queryClient.invalidateQueries({ queryKey: ["sesion-empresa"] });
        return;
      }
      navigate({ to: "/empresa-nueva", replace: true });
    })();
  }, [isLoading, sesion, queryClient, navigate]);

  return { sesion, isLoading };
}

export function puedeGestionar(role?: Rol | null) {
  return role === "admin_empresa" || role === "gestor_sanciones";
}

export function esAdministrador(role?: Rol | null) {
  return role === "admin_empresa";
}

/** Indica si el usuario autenticado es superadministrador de la plataforma. */
export function useEsSuperadmin() {
  return useQuery({
    queryKey: ["es-superadmin"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) return false;
      return Boolean(data);
    },
  });
}
