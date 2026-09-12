/**
 * Contrato de dominio compartido entre bff-web y los servicios de negocio
 * (identity, fleet, sanctions, analysis, drafts…). Ver SPEC.md §7.1.
 *
 * Antes vivía repartido y duplicado a mano en multas-export/src/hooks/*.ts y
 * multas-export/src/lib/fleet.ts (Etapa 2 del plan de refactor, ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §2.1). Un cambio de forma aquí es
 * un error de compilación en cada feature que lo consuma, no un `as never`
 * silencioso.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = [
  { value: "admin_empresa", label: "Administrador de empresa" },
  { value: "gestor_sanciones", label: "Gestor de sanciones" },
  { value: "revisor_juridico", label: "Gestor legal" },
] as const;

export type Rol = (typeof ROLES)[number]["value"];

// ---------------------------------------------------------------------------
// Sanciones (sanctions-service)
// ---------------------------------------------------------------------------

export const ESTADOS_SANCION = [
  "Nueva",
  "Pendiente de documentación",
  "Pendiente de identificación del conductor",
  "Pendiente de revisión",
  "Pagar con descuento",
  "Preparar alegaciones",
  "Alegaciones presentadas",
  "Recurso presentado",
  "Resuelta favorablemente",
  "Resuelta desfavorablemente",
  "Pagada",
  "Archivada",
] as const;

export type EstadoSancion = (typeof ESTADOS_SANCION)[number];

export const ESTADOS_ABIERTOS: EstadoSancion[] = [
  "Nueva",
  "Pendiente de documentación",
  "Pendiente de identificación del conductor",
  "Pendiente de revisión",
  "Pagar con descuento",
  "Preparar alegaciones",
  "Alegaciones presentadas",
  "Recurso presentado",
];

export const PRIORIDADES = ["Baja", "Normal", "Alta", "Crítica"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const CATEGORIAS = [
  "Velocidad",
  "Estacionamiento",
  "Identificación del conductor",
  "Tacógrafo",
  "Tiempos de conducción y descanso",
  "Pesos y dimensiones",
  "Documentación del vehículo",
  "Autorizaciones de transporte",
  "Carga y descarga",
  "Zonas de bajas emisiones",
  "Acceso urbano",
  "Mercancías peligrosas",
  "Inspección de transporte",
  "Otra",
];

export const ORGANISMOS = [
  "DGT",
  "Guardia Civil de Tráfico",
  "Ministerio de Transportes",
  "Ayuntamiento de Valencia",
  "Ayuntamiento de Alicante",
  "Ayuntamiento de Castellón",
  "Otro organismo",
];

export const TIPOS_VEHICULO = ["Tractora", "Semirremolque", "Rígido", "Furgoneta", "Otro"];

export const TIPOS_DOCUMENTO = [
  "Notificación de la sanción",
  "Alegaciones",
  "Recurso",
  "Justificante de pago",
  "Documentación del vehículo",
  "Documentación del conductor",
  "Otro",
];

export const TIPOS_ACTUACION = [
  "Registro del expediente",
  "Cambio de estado",
  "Solicitud de documentación",
  "Presentación de alegaciones",
  "Presentación de recurso",
  "Pago realizado",
  "Comunicación con el conductor",
  "Archivo del expediente",
];

export type Vehiculo = {
  id: string;
  organization_id: string;
  registration_number: string;
  internal_code: string | null;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  status: string;
  created_at: string;
};

export type Conductor = {
  id: string;
  organization_id: string;
  full_name: string;
  identification_number: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export type Sancion = {
  id: string;
  organization_id: string;
  reference_number: string;
  sanctioning_authority: string | null;
  sanction_category: string | null;
  description: string | null;
  violation_date: string | null;
  notification_date: string | null;
  payment_deadline: string | null;
  appeal_deadline: string | null;
  original_amount: number | null;
  discounted_amount: number | null;
  points: number | null;
  vehicle_id: string | null;
  driver_id: string | null;
  status: string;
  recommended_action: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: { registration_number: string } | null;
  drivers?: { full_name: string } | null;
};

export type DocumentoSancion = {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
};

export type Actuacion = {
  id: string;
  action_type: string;
  description: string | null;
  created_at: string;
};

export type Comentario = {
  id: string;
  comment: string;
  created_at: string;
  created_by: string | null;
};

// ---------------------------------------------------------------------------
// Organización / identidad (identity-service)
// ---------------------------------------------------------------------------

export type Organizacion = {
  id: string;
  name: string;
  cif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
};

export type SesionEmpresa = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Rol | null;
  organization: Organizacion | null;
};

export function puedeGestionar(role?: Rol | null): boolean {
  return role === "admin_empresa" || role === "gestor_sanciones";
}

export function esAdministrador(role?: Rol | null): boolean {
  return role === "admin_empresa";
}
