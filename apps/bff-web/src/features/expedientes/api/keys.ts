export const expedientesKeys = {
  lista: (orgId?: string | null) => ["sanciones", orgId] as const,
  detalle: (id?: string | null) => ["sancion", id] as const,
  actuaciones: (id?: string | null) => ["sancion-actions", id] as const,
  comentarios: (id?: string | null) => ["sancion-comments", id] as const,
};
