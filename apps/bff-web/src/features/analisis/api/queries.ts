import { useQuery } from "@tanstack/react-query";
import { fetchAnalisis } from "./client";

export const analisisKeys = { deSancion: (id?: string | null) => ["analisis", id] as const };

export function useAnalisis(sanctionId?: string) {
  return useQuery({
    queryKey: analisisKeys.deSancion(sanctionId),
    enabled: !!sanctionId,
    queryFn: () => fetchAnalisis(sanctionId!),
  });
}
