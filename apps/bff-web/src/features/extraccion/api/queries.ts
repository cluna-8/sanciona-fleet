import { useQuery } from "@tanstack/react-query";
import { fetchExtraccion } from "./client";

export const extraccionKeys = { deSancion: (id?: string | null) => ["extraccion", id] as const };

export function useExtraccion(sanctionId?: string) {
  return useQuery({
    queryKey: extraccionKeys.deSancion(sanctionId),
    enabled: !!sanctionId,
    queryFn: () => fetchExtraccion(sanctionId!),
  });
}
