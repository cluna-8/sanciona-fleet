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

export const ROLES = [
  { value: "admin_empresa", label: "Administrador de empresa" },
  { value: "gestor_sanciones", label: "Gestor de sanciones" },
  { value: "revisor_juridico", label: "Gestor legal" },
] as const;

export type Rol = (typeof ROLES)[number]["value"];

export function etiquetaRol(rol?: string | null) {
  return ROLES.find((r) => r.value === rol)?.label ?? "—";
}

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

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
export function formatoImporte(valor?: number | string | null) {
  const n = typeof valor === "string" ? (parseImporte(valor) ?? 0) : (valor ?? 0);
  return eur.format(Number.isFinite(n) ? n : 0);
}

export function formatoFecha(fecha?: string | null) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function diasRestantes(fecha?: string | null): number | null {
  if (!fecha) return null;
  const d = new Date(fecha + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

export type NivelAlerta = "vencido" | "critico" | "proximo" | "normal" | "resuelto" | "archivado";

export function nivelPlazo(fecha?: string | null, estado?: string | null): NivelAlerta {
  if (estado === "Archivada") return "archivado";
  if (estado === "Resuelta favorablemente") return "resuelto";
  if (estado === "Pagada" || estado === "Resuelta desfavorablemente") return "normal";
  const dias = diasRestantes(fecha);
  if (dias === null) return "normal";
  if (dias < 0) return "vencido";
  if (dias <= 2) return "critico";
  if (dias <= 7) return "proximo";
  return "normal";
}

export const CLASES_ALERTA: Record<NivelAlerta, string> = {
  vencido: "bg-destructive/10 text-destructive border-destructive/30",
  critico: "bg-destructive/10 text-destructive border-destructive/30",
  proximo: "bg-accent/15 text-accent border-accent/40",
  normal: "bg-secondary text-secondary-foreground border-border",
  resuelto: "bg-success/12 text-success border-success/30",
  archivado: "bg-muted text-muted-foreground border-border",
};

export function textoPlazo(fecha?: string | null) {
  const dias = diasRestantes(fecha);
  if (dias === null) return "Sin plazo";
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} d.`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Faltan ${dias} días`;
}

export const CLASES_ESTADO: Record<string, string> = {
  Nueva: "bg-navy/10 text-navy border-navy/20",
  "Pendiente de documentación": "bg-accent/15 text-accent border-accent/40",
  "Pendiente de identificación del conductor": "bg-accent/15 text-accent border-accent/40",
  "Pendiente de revisión": "bg-accent/15 text-accent border-accent/40",
  "Pagar con descuento": "bg-warning/20 text-warning-foreground border-warning/40",
  "Preparar alegaciones": "bg-navy/10 text-navy border-navy/20",
  "Alegaciones presentadas": "bg-navy/10 text-navy border-navy/20",
  "Recurso presentado": "bg-navy/10 text-navy border-navy/20",
  "Resuelta favorablemente": "bg-success/12 text-success border-success/30",
  "Resuelta desfavorablemente": "bg-destructive/10 text-destructive border-destructive/30",
  Pagada: "bg-success/12 text-success border-success/30",
  Archivada: "bg-muted text-muted-foreground border-border",
};

export const CLASES_PRIORIDAD: Record<string, string> = {
  Baja: "bg-muted text-muted-foreground border-border",
  Normal: "bg-navy/10 text-navy border-navy/20",
  Media: "bg-navy/10 text-navy border-navy/20",
  Alta: "bg-accent/15 text-accent border-accent/40",
  Crítica: "bg-destructive/10 text-destructive border-destructive/30",
};


/** Convierte un importe en texto (500.5, "500,50", "1.001,00", "1,001.00") a número. */
export function parseImporte(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  let s = String(valor).trim().replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const tienePunto = s.includes(".");
  const tieneComa = s.includes(",");
  if (tienePunto && tieneComa) {
    // el último separador es el decimal
    const decimal = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    s = s.split(miles).join("");
    if (decimal === ",") s = s.replace(",", ".");
  } else if (tieneComa) {
    // coma decimal salvo patrón claro de miles (1,001,00 no aplica)
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.split(",").join("") : s.replace(",", ".");
  } else if (tienePunto) {
    // punto de miles solo si el patrón es exacto 1.001 / 1.001.234
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.split(".").join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
