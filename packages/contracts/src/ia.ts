/**
 * Contrato compartido de las capacidades de IA.
 *
 * Lo importan `extraction-service`, `analysis-service` y `drafts-service`, y lo
 * implementa `packages/ai-provider`. Los tipos viven aquí y no dentro del
 * proveedor a propósito: la forma de los datos es del dominio, no del vendedor
 * de modelos. Cambiar de Google a OpenAI no debe tocar ni un tipo.
 *
 * Origen de la lógica: multas-export/src/lib/expediente.server.ts y
 * analisis.ts (monolito de Lovable). Ver SPEC.md §7.1.
 */

/* ------------------------------------------------------------------ */
/* Extracción documental                                              */
/* ------------------------------------------------------------------ */

export const NIVELES_CONFIANZA = ["Alto", "Medio", "Bajo"] as const;
export type NivelConfianza = (typeof NIVELES_CONFIANZA)[number];

/** Un campo leído del documento, con su fiabilidad y su origen literal. */
export type CampoExtraido = {
  valor: string | number | boolean | null;
  confianza: NivelConfianza;
  /** Fragmento literal del documento del que procede (máx. 120 caracteres). */
  fuente: string | null;
};

export type CamposExtraidos = Record<string, CampoExtraido>;

/**
 * Campos que el modelo puede devolver. La lista es cerrada a propósito: evita
 * que el modelo invente claves nuevas y que la UI reciba campos que no sabe
 * etiquetar.
 */
export const CLAVES_EXTRACCION = [
  "numero_expediente", "numero_denuncia", "referencia", "organismo",
  "administracion_competente", "direccion_organismo", "razon_social", "cif_nif",
  "titular", "matricula", "tipo_vehiculo", "marca", "modelo", "conductor_nombre",
  "conductor_dni", "fecha_infraccion", "hora_infraccion", "lugar", "carretera",
  "punto_kilometrico", "municipio", "provincia", "tipo_infraccion", "descripcion",
  "norma", "articulo", "apartado", "calificacion", "hechos_imputados",
  "importe_original", "importe_reducido", "porcentaje_reduccion", "recargo",
  "puntos", "fecha_denuncia", "fecha_emision", "fecha_notificacion",
  "fecha_recepcion", "fecha_limite_pago_reducido", "fecha_limite_alegaciones",
  "fecha_limite_recurso", "requiere_identificacion_conductor",
  "plazo_identificacion", "medio_pago", "medio_alegaciones",
  "documentacion_citada", "agente_denunciante", "pruebas_mencionadas", "categoria",
] as const;

export type ClaveExtraccion = (typeof CLAVES_EXTRACCION)[number];

/** Campos cuyo error tiene consecuencia directa: se marcan si la confianza es baja. */
export const CAMPOS_CRITICOS: readonly ClaveExtraccion[] = [
  "matricula", "numero_expediente", "importe_original", "fecha_notificacion",
  "fecha_limite_pago_reducido", "articulo", "conductor_nombre",
];

export type ResultadoExtraccion = {
  texto_documento: string;
  ocr_utilizado: boolean;
  campos: CamposExtraidos;
  avisos: string[];
  /** Identificador del modelo que produjo el resultado, para trazabilidad. */
  modelo: string;
};

/* ------------------------------------------------------------------ */
/* Análisis preliminar                                                */
/* ------------------------------------------------------------------ */

export const RECOMENDACIONES = [
  "Pagar con reducción", "Revisar", "Solicitar documentación",
  "Identificar conductor", "Preparar alegaciones", "Preparar recurso",
  "Revisión jurídica",
] as const;
export type Recomendacion = (typeof RECOMENDACIONES)[number];

export const SEMAFOROS = ["Verde", "Naranja", "Rojo", "Gris"] as const;
export type Semaforo = (typeof SEMAFOROS)[number];

export const TIPOS_FACTOR = [
  "plazo", "documentacion", "identificacion", "coherencia", "procedimiento", "economico",
] as const;
export type TipoFactor = (typeof TIPOS_FACTOR)[number];

export type Factor = { texto: string; tipo: TipoFactor };
export type RevisionProcedimiento = {
  apartado: string;
  resultado: "Correcto" | "Requiere comprobación" | "Posible incidencia";
  detalle: string;
};
export type RevisionPrueba = {
  elemento: string;
  estado: "Consta" | "No consta" | "Requiere comprobación";
  detalle: string;
};
export type ItemChecklist = {
  documento: string;
  estado: "Disponible" | "Pendiente" | "No aplicable";
  nota: string;
};
export type FuenteCitada = {
  norma: string;
  articulo: string;
  url: string;
  uso: string;
};

export type ResultadoAnalisis = {
  recomendacion: Recomendacion;
  motivo: string;
  proximo_paso: string;
  nivel_confianza: NivelConfianza;
  semaforo: Semaforo;
  factores: Factor[];
  revision_procedimiento: RevisionProcedimiento[];
  revision_prueba: RevisionPrueba[];
  incoherencias: string[];
  checklist: ItemChecklist[];
  fuentes: FuenteCitada[];
  modelo: string;
};

/* ------------------------------------------------------------------ */
/* Redacción de escritos                                              */
/* ------------------------------------------------------------------ */

export const TIPOS_ESCRITO = ["Alegaciones", "Recurso"] as const;
export type TipoEscrito = (typeof TIPOS_ESCRITO)[number];

export type ResultadoRedaccion = {
  /** Texto plano del escrito, con los encabezados en mayúsculas. */
  contenido: string;
  modelo: string;
};

/**
 * Norma que el modelo tiene permitido citar. Se le pasa el catálogo completo en
 * cada llamada y se le prohíbe citar cualquier cosa fuera de esta lista: es la
 * salvaguarda contra normas y jurisprudencia inventadas.
 */
export type FuenteVerificada = {
  norm: string;
  article?: string | null;
  section?: string | null;
  summary?: string | null;
  official_url?: string | null;
};
