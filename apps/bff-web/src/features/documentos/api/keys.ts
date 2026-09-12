export const documentosKeys = {
  organizacion: (orgId?: string | null) => ["documentos", orgId] as const,
  sancion: (sanctionId?: string | null) => ["sancion-docs", sanctionId] as const,
};
