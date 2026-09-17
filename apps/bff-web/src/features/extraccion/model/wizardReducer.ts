import type { Campos } from "./campos";
import { normalizarCampos } from "./normalizar";

/**
 * Reductor del wizard de extracción (Etapa 3.3). Colapsa los 14 `useState` que
 * vivían en `components/alta-documento.tsx` en una máquina de estados explícita
 * `inicial → subiendo → procesando → revisando → creando → creado | error`.
 * La UI sigue idéntica; sólo cambia el contenedor del estado.
 */

export const SIN_ASIGNAR = "__ninguno__";

export type Fase =
  "inicial" | "subiendo" | "procesando" | "revisando" | "creando" | "creado" | "error";

export type Sugerencias = {
  vehicleId: string | null;
  vehiculoTexto: string | null;
  driverId: string | null;
  conductorTexto: string | null;
};

export type EstadoWizard = {
  fase: Fase;
  archivo: File | null;
  tipoDoc: string;
  estado: string;
  extractionId: string | null;
  campos: Campos;
  camposOriginales: Campos;
  avisos: string[];
  vehiculo: string;
  conductor: string;
  confirmado: boolean;
  sugerencias: Sugerencias;
};

export type AccionWizard =
  | { type: "ELEGIR_ARCHIVO"; archivo: File }
  | { type: "QUITAR_ARCHIVO" }
  | { type: "CAMBIAR_TIPO_DOC"; tipoDoc: string }
  | { type: "INICIAR_PROCESADO" }
  | { type: "REGISTRAR_EXTRACCION"; extractionId: string }
  | { type: "PROCESADO_PENDIENTE"; estado: string }
  | {
      type: "PROCESADO_OK";
      campos: Campos;
      avisos: string[];
      estado: string;
      sugerencias: Sugerencias;
    }
  | { type: "PROCESADO_ERROR"; estado: string }
  | { type: "ACTUALIZAR_CAMPO"; clave: string; valor: string }
  | { type: "CAMBIAR_VEHICULO"; vehiculo: string }
  | { type: "CAMBIAR_CONDUCTOR"; conductor: string }
  | { type: "CONFIRMAR_DISCREPANCIA"; confirmado: boolean }
  | { type: "INICIAR_CREACION" }
  | { type: "CREADO" }
  | { type: "ERROR"; estado: string };

export function estadoInicial(tipoDoc: string): EstadoWizard {
  return {
    fase: "inicial",
    archivo: null,
    tipoDoc,
    estado: "",
    extractionId: null,
    campos: {},
    camposOriginales: {},
    avisos: [],
    vehiculo: SIN_ASIGNAR,
    conductor: SIN_ASIGNAR,
    confirmado: false,
    sugerencias: { vehicleId: null, vehiculoTexto: null, driverId: null, conductorTexto: null },
  };
}

export function wizardReducer(estado: EstadoWizard, accion: AccionWizard): EstadoWizard {
  switch (accion.type) {
    case "ELEGIR_ARCHIVO":
      return { ...estado, archivo: accion.archivo, estado: "", fase: "inicial" };
    case "QUITAR_ARCHIVO":
      return { ...estadoInicial(estado.tipoDoc) };
    case "CAMBIAR_TIPO_DOC":
      return { ...estado, tipoDoc: accion.tipoDoc };
    case "INICIAR_PROCESADO":
      return { ...estado, fase: "subiendo", estado: "Documento recibido" };
    case "REGISTRAR_EXTRACCION":
      return {
        ...estado,
        extractionId: accion.extractionId,
        fase: "procesando",
        estado: "Procesando documento",
      };
    case "PROCESADO_PENDIENTE":
      return { ...estado, fase: "procesando", estado: accion.estado };
    case "PROCESADO_OK": {
      const normalizados = normalizarCampos(accion.campos);
      return {
        ...estado,
        fase: "revisando",
        campos: normalizados,
        camposOriginales: normalizados,
        confirmado: false,
        avisos: accion.avisos,
        estado: accion.estado,
        vehiculo: accion.sugerencias.vehicleId ?? SIN_ASIGNAR,
        conductor: accion.sugerencias.driverId ?? SIN_ASIGNAR,
        sugerencias: accion.sugerencias,
      };
    }
    case "PROCESADO_ERROR":
      return { ...estado, fase: "inicial", estado: accion.estado };
    case "ACTUALIZAR_CAMPO":
      return {
        ...estado,
        campos: {
          ...estado.campos,
          [accion.clave]: {
            valor: accion.valor,
            confianza: estado.campos[accion.clave]?.confianza ?? "Alto",
            fuente: estado.campos[accion.clave]?.fuente ?? null,
          },
        },
      };
    case "CAMBIAR_VEHICULO":
      return { ...estado, vehiculo: accion.vehiculo };
    case "CAMBIAR_CONDUCTOR":
      return { ...estado, conductor: accion.conductor };
    case "CONFIRMAR_DISCREPANCIA":
      return { ...estado, confirmado: accion.confirmado };
    case "INICIAR_CREACION":
      return { ...estado, fase: "creando" };
    case "CREADO":
      return { ...estado, fase: "creado" };
    case "ERROR":
      return { ...estado, estado: accion.estado };
    default:
      return estado;
  }
}

/** Mapa `fase → paso` para el stepper y el gating de secciones (0..3). */
export function pasoDesdeFase(fase: Fase): number {
  switch (fase) {
    case "creado":
      return 3;
    case "revisando":
    case "creando":
      return 2;
    case "subiendo":
    case "procesando":
      return 1;
    default:
      return 0;
  }
}
