export const organizacionKeys = {
  sesion: () => ["sesion-empresa"] as const,
  esSuperadmin: () => ["es-superadmin"] as const,
  miembros: (orgId?: string | null) => ["miembros", orgId] as const,
  invitaciones: (orgId?: string | null) => ["invitaciones", orgId] as const,
};
