import { useQuery } from "@tanstack/react-query";
import { documentosKeys } from "./keys";
import { fetchDocumentosOrganizacion, fetchDocumentosSancion } from "./client";

export function useDocumentosOrganizacion(orgId?: string | null) {
  return useQuery({
    queryKey: documentosKeys.organizacion(orgId),
    enabled: !!orgId,
    queryFn: () => fetchDocumentosOrganizacion(orgId!),
  });
}

export function useDocumentosSancion(sanctionId?: string | null) {
  return useQuery({
    queryKey: documentosKeys.sancion(sanctionId),
    enabled: !!sanctionId,
    queryFn: () => fetchDocumentosSancion(sanctionId!),
  });
}
