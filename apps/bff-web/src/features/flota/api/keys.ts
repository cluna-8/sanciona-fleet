export const flotaKeys = {
  vehiculos: (orgId?: string | null) => ["vehiculos", orgId] as const,
  conductores: (orgId?: string | null) => ["conductores", orgId] as const,
};
