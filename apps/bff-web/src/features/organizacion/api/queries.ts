import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { organizacionKeys } from "./keys";
import {
  fetchSesion,
  esSuperadministrador,
  asegurarOrganizacionActiva,
  fetchMiembros,
  fetchInvitaciones,
} from "./client";
import type { Rol } from "@sanciona/contracts";

export function useSesion() {
  return useQuery({
    queryKey: organizacionKeys.sesion(),
    staleTime: 30_000,
    queryFn: fetchSesion,
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
      if (await asegurarOrganizacionActiva()) {
        await queryClient.invalidateQueries({ queryKey: organizacionKeys.sesion() });
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

export function useEsSuperadmin() {
  return useQuery({
    queryKey: organizacionKeys.esSuperadmin(),
    staleTime: 5 * 60_000,
    queryFn: esSuperadministrador,
  });
}

export function useMiembros(orgId?: string | null) {
  return useQuery({
    queryKey: organizacionKeys.miembros(orgId),
    enabled: !!orgId,
    queryFn: () => fetchMiembros(orgId!),
  });
}

export function useInvitaciones(orgId?: string | null) {
  return useQuery({
    queryKey: organizacionKeys.invitaciones(orgId),
    enabled: !!orgId,
    queryFn: () => fetchInvitaciones(orgId!),
  });
}
