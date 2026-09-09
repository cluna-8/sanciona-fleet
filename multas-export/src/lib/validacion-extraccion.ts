import { parseImporte } from "@/lib/fleet";
/** Validación y normalización de los datos extraídos antes de crear el expediente. */

export const OPCIONES_IDENTIFICACION = ["Sí", "No", "Pendiente de confirmar"] as const;
export type OpcionIdentificacion = (typeof OPCIONES_IDENTIFICACION)[number];

export const TIPOS_INFRACCION = [
  "Exceso de velocidad",
  "Exceso de tiempo de conducción",
  "Descanso insuficiente",
  "Manipulación de tacógrafo",
  "Exceso de peso",
  "Estacionamiento indebido",
  "Acceso a zona restringida",
  "Falta de documentación",
  "Identificación del conductor",
  "ITV",
  "Seguro",
  "Otra",
] as const;

export const CATEGORIAS_INFRACCION = [
  "Velocidad",
  "Tacógrafo",
  "Tiempos de conducción",
  "Tiempos de descanso",
  "Pesos y dimensiones",
  "Documentación",
  "Estacionamiento",
  "ZBE",
  "Transporte",
  "Otra",
] as const;

/** Categoría general asociada a cada tipo concreto de infracción. */
export const CATEGORIA_POR_TIPO: Record<string, string> = {
  "Exceso de velocidad": "Velocidad",
  "Exceso de tiempo de conducción": "Tiempos de conducción",
  "Descanso insuficiente": "Tiempos de descanso",
  "Manipulación de tacógrafo": "Tacógrafo",
  "Exceso de peso": "Pesos y dimensiones",
  "Estacionamiento indebido": "Estacionamiento",
  "Acceso a zona restringida": "ZBE",
  "Falta de documentación": "Documentación",
  "Identificación del conductor": "Documentación",
  ITV: "Documentación",
  Seguro: "Documentación",
  Otra: "Otra",
};

const PISTAS_TIPO: Array<{ tipo: string; palabras: RegExp }> = [
  { tipo: "Exceso de velocidad", palabras: /velocidad|km\/?h|radar|cinem[oó]metro/i },
  { tipo: "Manipulación de tacógrafo", palabras: /manipulaci[oó]n|im[aá]n|tac[oó]grafo\s+(manipul|alterad)/i },
  { tipo: "Exceso de tiempo de conducción", palabras: /tiempo(s)? de conducci[oó]n|conducci[oó]n (ininterrumpida|diaria|continuada)/i },
  { tipo: "Descanso insuficiente", palabras: /descanso|pausa/i },
  { tipo: "Exceso de peso", palabras: /peso|masa m[aá]xima|sobrecarga|mma|tara/i },
  { tipo: "Estacionamiento indebido", palabras: /estacionamiento|aparcamiento|estacionar/i },
  { tipo: "Acceso a zona restringida", palabras: /zona de bajas emisiones|zbe|zona restringida|acceso restringido|[aá]rea central/i },
  { tipo: "Identificación del conductor", palabras: /identificaci[oó]n del conductor|no identificar/i },
  { tipo: "ITV", palabras: /\bitv\b|inspecci[oó]n t[eé]cnica/i },
  { tipo: "Seguro", palabras: /seguro obligatorio|p[oó]liza|sin seguro/i },
  { tipo: "Falta de documentación", palabras: /documentaci[oó]n|autorizaci[oó]n de transporte|tarjeta de transporte|carta de porte/i },
  { tipo: "Manipulación de tacógrafo", palabras: /tac[oó]grafo/i },
];

/** Deduce un tipo concreto a partir de los textos disponibles del documento. */
export function deducirTipoInfraccion(...textos: Array<string | null | undefined>): string | null {
  const base = textos.filter(Boolean).join(" · ");
  if (!base.trim()) return null;
  for (const pista of PISTAS_TIPO) {
    if (pista.palabras.test(base)) return pista.tipo;
  }
  return null;
}

export function esTipoGenerico(valor?: string | null) {
  if (!valor) return true;
  const t = valor.trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(infracci[oó]n|infracci[oó]n de tr[aá]fico|infracci[oó]n administrativa|sanci[oó]n|denuncia|otra|otros|tr[aá]fico|transporte)$/.test(
    t,
  );
}

/** Normaliza un CIF/NIF: sin espacios, guiones ni puntos, en mayúsculas. */
export function normalizarCif(valor?: string | null) {
  return String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizarNombre(valor?: string | null) {
  return String(valor ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(S\.?L\.?U?|S\.?A\.?U?|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|SLU|SAU)\b/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ComparacionEmpresa = {
  cifCoincide: boolean;
  cifComparable: boolean;
  nombreCoincide: boolean;
  nombreComparable: boolean;
  cifEmpresa: string;
  cifDocumento: string;
  nombreEmpresa: string;
  nombreDocumento: string;
};

export function compararEmpresa(
  empresa: { name?: string | null; cif?: string | null } | null | undefined,
  documento: { razonSocial?: string | null; cif?: string | null },
): ComparacionEmpresa {
  const cifEmpresa = normalizarCif(empresa?.cif);
  const cifDocumento = normalizarCif(documento.cif);
  const nombreEmpresa = normalizarNombre(empresa?.name);
  const nombreDocumento = normalizarNombre(documento.razonSocial);
  const nombreComparable = Boolean(nombreEmpresa && nombreDocumento);
  const nombreCoincide =
    !nombreComparable ||
    nombreEmpresa === nombreDocumento ||
    nombreEmpresa.includes(nombreDocumento) ||
    nombreDocumento.includes(nombreEmpresa);

  return {
    cifComparable: Boolean(cifEmpresa && cifDocumento),
    cifCoincide: Boolean(cifEmpresa && cifDocumento && cifEmpresa === cifDocumento),
    nombreComparable,
    nombreCoincide,
    cifEmpresa: String(empresa?.cif ?? "").trim(),
    cifDocumento: String(documento.cif ?? "").trim(),
    nombreEmpresa: String(empresa?.name ?? "").trim(),
    nombreDocumento: String(documento.razonSocial ?? "").trim(),
  };
}

export type Incidencia = { clave: string; mensaje: string; nivel: "aviso" | "pendiente" };

const OBLIGATORIOS: Array<{ clave: string; etiqueta: string }> = [
  { clave: "razon_social", etiqueta: "Empresa sancionada" },
  { clave: "cif_nif", etiqueta: "CIF / NIF" },
  { clave: "matricula", etiqueta: "Matrícula" },
  { clave: "numero_expediente", etiqueta: "Número de expediente" },
  { clave: "importe_original", etiqueta: "Importe" },
  { clave: "fecha_infraccion", etiqueta: "Fecha de la infracción" },
  { clave: "tipo_infraccion", etiqueta: "Tipo de infracción" },
];

function comoTexto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

/** Validación rápida previa a la creación del expediente. */
export function validarAntesDeCrear(
  campos: Record<string, { valor: string | number | boolean | null }>,
  comparacion: ComparacionEmpresa,
): Incidencia[] {
  const incidencias: Incidencia[] = [];

  for (const campo of OBLIGATORIOS) {
    const valor = comoTexto(campos[campo.clave]?.valor);
    if (!valor || valor === "Pendiente de confirmar") {
      incidencias.push({
        clave: campo.clave,
        mensaje: `${campo.etiqueta}: pendiente de confirmar.`,
        nivel: "pendiente",
      });
    }
  }

  if (esTipoGenerico(comoTexto(campos["tipo_infraccion"]?.valor))) {
    incidencias.push({
      clave: "tipo_infraccion",
      mensaje: "El tipo de infracción es demasiado genérico. Concreta el tipo antes de crear el expediente.",
      nivel: "aviso",
    });
  }

  const importe = parseImporte(campos["importe_original"]?.valor) ?? NaN;
  if (comoTexto(campos["importe_original"]?.valor) && (!Number.isFinite(importe) || importe <= 0)) {
    incidencias.push({ clave: "importe_original", mensaje: "El importe no es un valor válido.", nivel: "aviso" });
  }

  const fInfraccion = comoTexto(campos["fecha_infraccion"]?.valor);
  const fNotificacion = comoTexto(campos["fecha_notificacion"]?.valor);
  if (fInfraccion && fNotificacion && fNotificacion < fInfraccion) {
    incidencias.push({
      clave: "fecha_notificacion",
      mensaje: "La fecha de notificación es anterior a la fecha de la infracción.",
      nivel: "aviso",
    });
  }

  if (comparacion.cifComparable && !comparacion.cifCoincide) {
    incidencias.push({
      clave: "cif_nif",
      mensaje: "El CIF del documento no coincide con el CIF de la empresa activa.",
      nivel: "aviso",
    });
  } else if (!comparacion.cifComparable) {
    incidencias.push({
      clave: "cif_nif",
      mensaje: "No ha sido posible comparar el CIF del documento con el de la empresa activa.",
      nivel: "pendiente",
    });
  }

  if (comparacion.nombreComparable && !comparacion.nombreCoincide) {
    incidencias.push({
      clave: "razon_social",
      mensaje: "La razón social del documento difiere de la de la empresa activa (comprobación orientativa).",
      nivel: "aviso",
    });
  }

  return incidencias;
}
