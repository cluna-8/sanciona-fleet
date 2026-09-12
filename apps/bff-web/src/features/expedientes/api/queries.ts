import { useQuery } from "@tanstack/react-query";
import { expedientesKeys } from "./keys";
import { fetchSanciones, fetchSancion, fetchActuaciones, fetchComentarios } from "./client";

export function useSanciones(orgId?: string | null) {
  return useQuery({
    queryKey: expedientesKeys.lista(orgId),
    enabled: !!orgId,
    queryFn: () => fetchSanciones(orgId!),
  });
}

export function useSancion(id?: string | null) {
  return useQuery({
    queryKey: expedientesKeys.detalle(id),
    enabled: !!id,
    queryFn: () => fetchSancion(id!),
  });
}

export function useActuaciones(id?: string | null) {
  return useQuery({
    queryKey: expedientesKeys.actuaciones(id),
    enabled: !!id,
    queryFn: () => fetchActuaciones(id!),
  });
}

export function useComentarios(id?: string | null) {
  return useQuery({
    queryKey: expedientesKeys.comentarios(id),
    enabled: !!id,
    queryFn: () => fetchComentarios(id!),
  });
}
