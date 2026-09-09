/**
 * Contrato compartido de deadlines-service.
 *
 * Cualquier servicio que necesite pedir el cálculo de plazos (sanctions-service,
 * bff-web, extraction-service tras una extracción) importa estos tipos en vez
 * de redefinirlos. Un cambio de forma aquí es un error de compilación en cada
 * consumidor, no un bug descubierto en producción.
 *
 * Fuente de la lógica original: multas-export/src/lib/plazos.ts (monolito
 * heredado de Lovable). Este contrato y el servicio que lo implementa son la
 * primera pieza extraída a microservicios — ver SPEC.md §7.5.
 */

export const TIPOS_PLAZO = [
  "Pago con reducción",
  "Alegaciones",
  "Identificación del conductor",
  "Recurso",
] as const;

export type TipoPlazo = (typeof TIPOS_PLAZO)[number];

export type EstadoPlazo =
  | "Confirmado"
  | "Calculado"
  | "Pendiente de verificación"
  | "Vencido"
  | "Plazo pendiente de determinar"
  | "Sin datos";

export type PlazoCalculado = {
  deadline_type: TipoPlazo;
  start_date: string | null;
  end_date: string | null;
  document_date: string | null;
  calculation_basis: string;
  day_type: "naturales" | "hábiles";
  source: "documento" | "calculo" | "documento+calculo";
  status: EstadoPlazo;
  notes: string | null;
};

/** Entrada mínima necesaria para calcular los plazos de un expediente. */
export type EntradaPlazos = {
  notification_date?: string | null;
  reception_date?: string | null;
  issue_date?: string | null;
  sanctioning_authority?: string | null;
  sanction_category?: string | null;
  requires_driver_identification?: boolean | null;
  /** Fechas límite indicadas expresamente en el documento. */
  payment_deadline?: string | null;
  appeal_deadline?: string | null;
  driver_identification_deadline?: string | null;
  resolution_notified_date?: string | null;
};

/** Cuerpo de la petición a POST /calcular (o del RPC calcular()). */
export type PeticionCalculoPlazos = {
  sanction_id: string;
  entrada: EntradaPlazos;
};

/** Respuesta de deadlines-service. */
export type RespuestaCalculoPlazos = {
  sanction_id: string;
  plazos: PlazoCalculado[];
  calculado_en: string;
};
