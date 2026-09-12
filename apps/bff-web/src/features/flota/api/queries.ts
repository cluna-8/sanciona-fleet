import { useQuery } from "@tanstack/react-query";
import { flotaKeys } from "./keys";
import { fetchVehiculos, fetchConductores } from "./client";

export function useVehiculos(orgId?: string | null) {
  return useQuery({
    queryKey: flotaKeys.vehiculos(orgId),
    enabled: !!orgId,
    queryFn: () => fetchVehiculos(orgId!),
  });
}

export function useConductores(orgId?: string | null) {
  return useQuery({
    queryKey: flotaKeys.conductores(orgId),
    enabled: !!orgId,
    queryFn: () => fetchConductores(orgId!),
  });
}
