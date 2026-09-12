import { useQuery } from "@tanstack/react-query";
import { fetchBorradores, fetchBorrador, fetchVersiones } from "./client";

export const borradoresKeys = {
  deSancion: (id?: string | null) => ["borradores", id] as const,
  detalle: (id?: string | null) => ["borrador", id] as const,
  versiones: (id?: string | null) => ["borrador-versiones", id] as const,
};

export function useBorradores(sanctionId?: string) {
  return useQuery({
    queryKey: borradoresKeys.deSancion(sanctionId),
    enabled: !!sanctionId,
    queryFn: () => fetchBorradores(sanctionId!),
  });
}

export function useBorrador(draftId?: string) {
  return useQuery({
    queryKey: borradoresKeys.detalle(draftId),
    enabled: !!draftId,
    queryFn: () => fetchBorrador(draftId!),
  });
}

export function useVersiones(draftId?: string) {
  return useQuery({
    queryKey: borradoresKeys.versiones(draftId),
    enabled: !!draftId,
    queryFn: () => fetchVersiones(draftId!),
  });
}
