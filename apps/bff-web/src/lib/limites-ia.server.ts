/**
 * Cuota diaria de IA por organización y log de uso (A-3b, ADR 0003).
 *
 * `comprobarCuotaDiariaIA` se llama antes de cada operación que gasta tokens
 * (extracción, análisis, borrador): cuenta las filas de `ai_usage_logs` del día
 * en curso y corta con un mensaje amigable si se alcanzó el límite. Si el
 * conteo falla — p. ej. la tabla aún no existe — falla ABIERTO: la disponibilidad
 * manda y el orden de despliegue es migración-primero.
 *
 * `registrarUsoIA` escribe una fila por llamada exitosa al modelo. Es
 * contable, no bloqueante: una operación que ya costó dinero no se rompe porque
 * no se pueda auditar (diferencia deliberada con la auditoría A-4, que sí
 * lanza).
 *
 * El día se cuenta en Europe/Madrid, no en UTC: el límite es una noción de
 * negocio de cara al cliente español y con UTC se restablecería a la 01:00/02:00
 * local, con la confusión de soporte que eso implica. `inicioDiaEnZona` maneja
 * el cambio de hora vía Intl, sin dependencias.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ClienteSupabase = Pick<SupabaseClient<Database>, "from">;

/** Las tres operaciones de IA que gastan tokens y se registran en el log. */
export type UsoIA = "extraccion" | "analisis" | "borrador";

/** Límite plano por organización al día. Tunable sin despliegue vía SSM. */
export const LIMITE_DIARIO_POR_DEFECTO = Number(process.env["IA_LIMITE_DIARIO_ORG"] ?? 100);

/**
 * Límites por plan de `organizations.plan` (basico/pro/empresa). Inactivo
 * hasta la puerta de precios (ADR 0004 D-4/D-5): vacío, todas las
 * organizaciones usan `LIMITE_DIARIO_POR_DEFECTO` y `comprobarCuotaDiariaIA`
 * ni siquiera consulta el plan. Cuando existan precios por plan basta con
 * rellenar este mapa — el cableado ya está hecho.
 */
const LIMITES_POR_PLAN: Record<string, number> = {};

export function limiteDiarioIA(plan?: string | null): number {
  return LIMITES_POR_PLAN[plan ?? ""] ?? LIMITE_DIARIO_POR_DEFECTO;
}

type PartesZona = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Partes de fecha-hora de un instante en una zona, con hora 0–23 (no 24). */
function partesEnZona(ms: number, zona: string): PartesZona {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const valores: PartesZona = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const { type, value } of partes) {
    if (
      type === "year" ||
      type === "month" ||
      type === "day" ||
      type === "hour" ||
      type === "minute" ||
      type === "second"
    ) {
      valores[type] = Number(value);
    }
  }
  return valores;
}

/** Desfase de la zona (ms) en un instante: lo que hay que restar a la hora local vista como UTC. */
function offsetZona(ms: number, zona: string): number {
  const p = partesEnZona(ms, zona);
  const comoUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return comoUTC - ms;
}

/**
 * Instante UTC de la medianoche local del día que contiene `ahora` en `zona`.
 *
 * Dos pasadas de corrección absorben el desfase de la zona, DST incluido: si
 * la transición cayera justo en medianoche (no ocurre en España: cambia a las
 * 02:00/03:00), la segunda pasada converge igualmente.
 */
export function inicioDiaEnZona(ahora: Date, zona: string): Date {
  const local = partesEnZona(ahora.getTime(), zona);
  const medianocheLocalVistaUTC = Date.UTC(local.year, local.month - 1, local.day);
  let instante = medianocheLocalVistaUTC;
  for (let i = 0; i < 2; i++) {
    instante = medianocheLocalVistaUTC - offsetZona(instante, zona);
  }
  return new Date(instante);
}

/**
 * Lanza si la organización alcanzó su límite de operaciones con IA del día.
 * Llamar ANTES de marcar la extracción como "Procesando documento": un error
 * de cuota no debe dejar rastro de "Error de procesamiento".
 *
 * Carrera aceptada en v1: dos llamadas concurrentes pueden colarse antes de que
 * ninguna cuente a la otra. Es un tope de gasto, no un control de acceso.
 */
export async function comprobarCuotaDiariaIA(
  supabase: ClienteSupabase,
  orgId: string,
  plan?: string | null,
): Promise<void> {
  let planEfectivo = plan ?? null;
  // El mapa por plan está vacío (puerta de precios): no se paga la consulta.
  if (Object.keys(LIMITES_POR_PLAN).length > 0 && planEfectivo === null) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", orgId)
      .single();
    planEfectivo = org?.plan ?? null;
  }

  const limite = limiteDiarioIA(planEfectivo);
  const desde = inicioDiaEnZona(new Date(), "Europe/Madrid");
  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", desde.toISOString());

  if (error) {
    console.error(
      `[cuota-ia] no se ha podido contar el uso (${error.message}); se permite la operación`,
    );
    return;
  }
  if ((count ?? 0) >= limite) {
    throw new Error(
      `Se ha alcanzado el límite diario de operaciones con IA (${limite} al día). Se restablece mañana.`,
    );
  }
}

/** Registra una llamada exitosa al modelo. Nunca lanza: es contable, no bloqueante. */
export async function registrarUsoIA(
  supabase: ClienteSupabase,
  uso: {
    organizationId: string;
    userId: string;
    kind: UsoIA;
    model: string;
    tokens?: { entrada: number; salida: number };
  },
): Promise<void> {
  const { error } = await supabase.from("ai_usage_logs").insert({
    organization_id: uso.organizationId,
    user_id: uso.userId,
    kind: uso.kind,
    model: uso.model,
    ...(uso.tokens ? { tokens_entrada: uso.tokens.entrada, tokens_salida: uso.tokens.salida } : {}),
  });
  if (error) {
    console.error(`[uso-ia] no se ha podido registrar el uso (${error.message})`);
  }
}
