/** Tipos y etiquetas compartidos del módulo de análisis de expedientes. */

export const RECOMENDACIONES = [
  "Pagar con reducción",
  "Revisar",
  "Solicitar documentación",
  "Identificar conductor",
  "Preparar alegaciones",
  "Preparar recurso",
  "Revisión jurídica",
] as const;

export type Recomendacion = (typeof RECOMENDACIONES)[number];

export const ACCION_RECOMENDADA_TEXTO: Record<string, string> = {
  "Pagar con reducción": "Pagar con reducción dentro de plazo",
  Revisar: "Revisar antes de efectuar el pago",
  "Solicitar documentación": "Solicitar el expediente administrativo",
  "Identificar conductor": "Identificar al conductor ante el organismo",
  "Preparar alegaciones": "Preparar escrito de alegaciones",
  "Preparar recurso": "Preparar recurso administrativo",
  "Revisión jurídica": "Enviar a revisión jurídica",
};

export const SEMAFOROS = ["Verde", "Naranja", "Rojo", "Gris"] as const;
export type Semaforo = (typeof SEMAFOROS)[number];

export const SEMAFORO_TEXTO: Record<Semaforo, string> = {
  Verde: "Expediente aparentemente correcto",
  Naranja: "Revisión recomendada",
  Rojo: "Actuación urgente",
  Gris: "Información insuficiente",
};

export const CLASES_SEMAFORO: Record<Semaforo, string> = {
  Verde: "bg-success/12 text-success border-success/30",
  Naranja: "bg-accent/15 text-accent border-accent/40",
  Rojo: "bg-destructive/10 text-destructive border-destructive/30",
  Gris: "bg-muted text-muted-foreground border-border",
};

export const NIVELES_CONFIANZA = ["Alto", "Medio", "Bajo"] as const;
export type NivelConfianza = (typeof NIVELES_CONFIANZA)[number];

export const ESTADOS_PROCESO = [
  "Documento recibido",
  "Procesando documento",
  "Información extraída",
  "Revisión requerida",
  "Análisis completado",
  "Error de procesamiento",
] as const;

export const ESTADOS_BORRADOR = [
  "Borrador",
  "Pendiente de revisión",
  "Revisado",
  "Validado",
  "Presentado",
] as const;
export type EstadoBorrador = (typeof ESTADOS_BORRADOR)[number];

export const CLASES_ESTADO_BORRADOR: Record<string, string> = {
  Borrador: "bg-muted text-muted-foreground border-border",
  "Pendiente de revisión": "bg-accent/15 text-accent border-accent/40",
  Revisado: "bg-navy/10 text-navy border-navy/20",
  Validado: "bg-success/12 text-success border-success/30",
  Presentado: "bg-navy/10 text-navy border-navy/20",
};

export const ESTADOS_CHECKLIST = ["Disponible", "Pendiente", "No aplicable"] as const;

export const DOCUMENTACION_BASE = [
  "Notificación completa",
  "Fotografías o pruebas gráficas",
  "Expediente administrativo",
  "Identificación del conductor",
  "Datos de tacógrafo",
  "Certificado de verificación del instrumento de medida",
  "Carta de porte",
  "Documentación del vehículo",
  "Autorización de transporte",
  "Justificante de pago",
];

/** Campo extraído con su nivel de confianza y su origen en el documento. */
export type CampoExtraido = {
  valor: string | number | boolean | null;
  confianza: NivelConfianza;
  fuente?: string | null;
};

export const CAMPOS_CRITICOS = [
  "matricula",
  "numero_expediente",
  "importe_original",
  "fecha_notificacion",
  "fecha_limite_pago_reducido",
  "articulo",
  "conductor_nombre",
];

export const ETIQUETAS_CAMPO: Record<string, string> = {
  numero_expediente: "Número de expediente",
  numero_denuncia: "Número de denuncia",
  referencia: "Referencia",
  organismo: "Organismo sancionador",
  administracion_competente: "Administración competente",
  direccion_organismo: "Dirección del organismo",
  razon_social: "Razón social sancionada",
  cif_nif: "CIF / NIF",
  titular: "Nombre del titular",
  matricula: "Matrícula",
  tipo_vehiculo: "Tipo de vehículo",
  marca: "Marca",
  modelo: "Modelo",
  conductor_nombre: "Conductor",
  conductor_dni: "DNI / NIE del conductor",
  fecha_infraccion: "Fecha de la infracción",
  hora_infraccion: "Hora",
  lugar: "Lugar",
  carretera: "Carretera",
  punto_kilometrico: "Punto kilométrico",
  municipio: "Municipio",
  provincia: "Provincia",
  tipo_infraccion: "Tipo de infracción",
  descripcion: "Descripción",
  norma: "Norma citada",
  articulo: "Artículo",
  apartado: "Apartado",
  calificacion: "Calificación",
  hechos_imputados: "Hechos imputados",
  importe_original: "Importe original",
  importe_reducido: "Importe reducido",
  porcentaje_reduccion: "Porcentaje de reducción",
  recargo: "Recargo",
  puntos: "Puntos",
  fecha_denuncia: "Fecha de denuncia",
  fecha_emision: "Fecha de emisión",
  fecha_notificacion: "Fecha de notificación",
  fecha_recepcion: "Fecha de recepción",
  fecha_limite_pago_reducido: "Fecha límite de pago reducido",
  fecha_limite_alegaciones: "Fecha límite de alegaciones",
  fecha_limite_recurso: "Fecha límite de recurso",
  requiere_identificacion_conductor: "Identificación del conductor",
  plazo_identificacion: "Plazo de identificación",
  medio_pago: "Medio de pago",
  medio_alegaciones: "Medio de presentación de alegaciones",
  documentacion_citada: "Documentación citada",
  agente_denunciante: "Agente denunciante",
  pruebas_mencionadas: "Fotografías o pruebas mencionadas",
  categoria: "Categoría de la infracción",
};

export const ORDEN_CAMPOS = Object.keys(ETIQUETAS_CAMPO);

export function esCampoCritico(clave: string) {
  return CAMPOS_CRITICOS.includes(clave);
}

export function valorTexto(valor: CampoExtraido["valor"]): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  return String(valor);
}
