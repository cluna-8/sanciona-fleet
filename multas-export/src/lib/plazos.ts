/**
 * Motor de plazos determinista.
 * No depende de ningún modelo generativo: aplica reglas fijas sobre las fechas
 * del expediente y las compara con las fechas que figuren en el documento.
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

export type EntradaPlazos = {
  notification_date?: string | null;
  reception_date?: string | null;
  issue_date?: string | null;
  sanctioning_authority?: string | null;
  sanction_category?: string | null;
  requires_driver_identification?: boolean | null;
  /** Fechas límite indicadas expresamente en el documento */
  payment_deadline?: string | null;
  appeal_deadline?: string | null;
  driver_identification_deadline?: string | null;
  resolution_notified_date?: string | null;
};

/* ---------- utilidades de fechas ---------- */

function aFecha(valor?: string | null): Date | null {
  if (!valor) return null;
  const d = new Date(`${valor.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Festivos nacionales de fecha fija (día-mes). No incluye autonómicos ni móviles. */
const FESTIVOS_FIJOS = new Set([
  "01-01",
  "01-06",
  "05-01",
  "08-15",
  "10-12",
  "11-01",
  "12-06",
  "12-08",
  "12-25",
]);

function esHabil(d: Date): boolean {
  const dia = d.getDay();
  if (dia === 0 || dia === 6) return false;
  const clave = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return !FESTIVOS_FIJOS.has(clave);
}

export function sumarDiasNaturales(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

export function sumarDiasHabiles(base: Date, dias: number): Date {
  const d = new Date(base);
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (esHabil(d)) restantes -= 1;
  }
  return d;
}

export function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  if (d.getDate() < dia) d.setDate(0);
  return d;
}

function diferenciaDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/* ---------- reglas ---------- */

const ORGANISMOS_TRAFICO = ["dgt", "guardia civil", "tráfico", "trafico", "ayuntamiento"];

function esProcedimientoTrafico(organismo?: string | null) {
  const o = (organismo ?? "").toLowerCase();
  return ORGANISMOS_TRAFICO.some((k) => o.includes(k));
}

function esProcedimientoTransporte(organismo?: string | null) {
  const o = (organismo ?? "").toLowerCase();
  return o.includes("transporte") || o.includes("ministerio") || o.includes("inspección");
}

type Regla = {
  tipo: TipoPlazo;
  dias?: number;
  meses?: number;
  tipoDia: "naturales" | "hábiles";
  base: string;
  fiable: boolean;
};

function reglasAplicables(entrada: EntradaPlazos): Regla[] {
  const trafico = esProcedimientoTrafico(entrada.sanctioning_authority);
  const transporte = esProcedimientoTransporte(entrada.sanctioning_authority);

  const reglas: Regla[] = [];

  if (trafico) {
    reglas.push({
      tipo: "Pago con reducción",
      dias: 20,
      tipoDia: "naturales",
      base: "20 días naturales desde la notificación (art. 94 RDL 6/2015, reducción del 50 %).",
      fiable: true,
    });
    reglas.push({
      tipo: "Alegaciones",
      dias: 20,
      tipoDia: "naturales",
      base: "20 días naturales desde la notificación de la denuncia (procedimiento sancionador de tráfico).",
      fiable: true,
    });
    reglas.push({
      tipo: "Identificación del conductor",
      dias: 15,
      tipoDia: "naturales",
      base: "Plazo habitual de 15 días naturales desde la notificación (art. 11 RDL 6/2015). Verificar el plazo indicado en el documento.",
      fiable: false,
    });
  } else if (transporte) {
    reglas.push({
      tipo: "Alegaciones",
      dias: 15,
      tipoDia: "hábiles",
      base: "Plazo de alegaciones del procedimiento administrativo común. Debe contrastarse con el plazo indicado en la notificación.",
      fiable: false,
    });
    reglas.push({
      tipo: "Pago con reducción",
      dias: 15,
      tipoDia: "hábiles",
      base: "Reducción por pago anticipado en procedimientos de transporte. Requiere verificación con el documento.",
      fiable: false,
    });
  } else {
    reglas.push({
      tipo: "Alegaciones",
      dias: 15,
      tipoDia: "hábiles",
      base: "Cálculo genérico del procedimiento administrativo común. Requiere verificación.",
      fiable: false,
    });
  }

  reglas.push({
    tipo: "Recurso",
    meses: 1,
    tipoDia: "naturales",
    base: "1 mes desde la notificación de la resolución sancionadora (recurso de reposición / alzada según organismo).",
    fiable: false,
  });

  return reglas;
}

/* ---------- cálculo ---------- */

export function calcularPlazos(entrada: EntradaPlazos): PlazoCalculado[] {
  // Nunca se calcula un plazo desde la fecha de emisión: si falta la fecha
  // efectiva de notificación (o recepción), el plazo queda pendiente de determinar.
  const inicio = aFecha(entrada.notification_date) ?? aFecha(entrada.reception_date);
  const inicioResolucion = aFecha(entrada.resolution_notified_date) ?? inicio;

  const documentales: Partial<Record<TipoPlazo, string | null | undefined>> = {
    "Pago con reducción": entrada.payment_deadline,
    Alegaciones: entrada.appeal_deadline,
    "Identificación del conductor": entrada.driver_identification_deadline,
    Recurso: null,
  };

  const resultado: PlazoCalculado[] = [];

  for (const regla of reglasAplicables(entrada)) {
    if (regla.tipo === "Identificación del conductor" && !entrada.requires_driver_identification) {
      continue;
    }

    const baseFecha = regla.tipo === "Recurso" ? inicioResolucion : inicio;
    const fechaDocumento = documentales[regla.tipo] ?? null;
    const doc = aFecha(fechaDocumento);

    let calculada: Date | null = null;
    if (baseFecha) {
      if (regla.meses) calculada = sumarMeses(baseFecha, regla.meses);
      else if (regla.tipoDia === "hábiles") calculada = sumarDiasHabiles(baseFecha, regla.dias ?? 0);
      else calculada = sumarDiasNaturales(baseFecha, regla.dias ?? 0);
    }

    let fechaFinal: Date | null = null;
    let source: PlazoCalculado["source"] = "calculo";
    let status: EstadoPlazo = "Calculado";
    let notes: string | null = null;

    if (doc && calculada) {
      // El documento manda, pero se contrasta con el cálculo interno.
      fechaFinal = doc;
      source = "documento+calculo";
      const dif = Math.abs(diferenciaDias(doc, calculada));
      if (dif <= 1) {
        status = "Confirmado";
        notes = "La fecha indicada en el documento coincide con el cálculo interno.";
      } else {
        status = "Pendiente de verificación";
        notes = `Discrepancia de ${dif} días entre la fecha del documento (${aIso(doc)}) y el cálculo interno (${aIso(calculada)}).`;
      }
    } else if (doc) {
      fechaFinal = doc;
      source = "documento";
      status = "Confirmado";
      notes = "Fecha tomada directamente del documento notificado.";
    } else if (calculada) {
      fechaFinal = calculada;
      source = "calculo";
      status = regla.fiable ? "Calculado" : "Pendiente de verificación";
      if (!regla.fiable) notes = "Cálculo orientativo: debe contrastarse con el plazo indicado en la notificación.";
    } else {
      status = "Plazo pendiente de determinar";
      notes =
        "Plazo pendiente de determinar: no consta la fecha efectiva de notificación ni un plazo expreso en el documento. No se calcula desde la fecha de emisión.";
    }

    if (fechaFinal) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaFinal.getTime() < hoy.getTime() && status !== "Pendiente de verificación") {
        status = "Vencido";
      }
    }

    resultado.push({
      deadline_type: regla.tipo,
      start_date: baseFecha ? aIso(baseFecha) : null,
      end_date: fechaFinal ? aIso(fechaFinal) : null,
      document_date: doc ? aIso(doc) : null,
      calculation_basis: regla.base,
      day_type: regla.tipoDia,
      source,
      status,
      notes,
    });
  }

  return resultado;
}

export const CLASES_ESTADO_PLAZO: Record<EstadoPlazo, string> = {
  Confirmado: "bg-success/12 text-success border-success/30",
  Calculado: "bg-secondary text-secondary-foreground border-border",
  "Pendiente de verificación": "bg-accent/15 text-accent border-accent/40",
  Vencido: "bg-destructive/10 text-destructive border-destructive/30",
  "Plazo pendiente de determinar": "bg-muted text-muted-foreground border-border",
  "Sin datos": "bg-muted text-muted-foreground border-border",
};
