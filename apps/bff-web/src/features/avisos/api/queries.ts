import { useQuery } from "@tanstack/react-query";
import { fetchAvisos } from "./client";

export const avisosKeys = {
  lista: (orgId?: string | null, soloNoLeidos?: boolean) =>
    ["avisos", orgId, soloNoLeidos] as const,
};

export function useAvisos(orgId?: string | null, soloNoLeidos = false) {
  return useQuery({
    queryKey: avisosKeys.lista(orgId, soloNoLeidos),
    enabled: !!orgId,
    queryFn: () => fetchAvisos(orgId!, soloNoLeidos),
  });
}
