import { useQuery } from "@tanstack/react-query";
import { fetchPlazos } from "./client";

export const plazosKeys = { deSancion: (id?: string | null) => ["plazos", id] as const };

export function usePlazos(sanctionId?: string) {
  return useQuery({
    queryKey: plazosKeys.deSancion(sanctionId),
    enabled: !!sanctionId,
    queryFn: () => fetchPlazos(sanctionId!),
  });
}
