/**
 * Lógica común a todos los proveedores.
 *
 * Las tres capacidades (extraer, analizar, redactar) son idénticas sea cual sea
 * el vendedor: cambia solo el transporte HTTP y la forma del cuerpo. Por eso el
 * flujo vive aquí y cada proveedor solo implementa `completar()`.
 */
import type {
  ResultadoAnalisis, ResultadoExtraccion, ResultadoRedaccion,
} from "@sanciona/contracts";
import { ErrorIA } from "../errores";
import { bufferABase64, extraerJson } from "../json";
import { normalizarAnalisis, normalizarCampos } from "../normalizar";
import { SISTEMA_ANALISIS, SISTEMA_BORRADOR, SISTEMA_EXTRACCION, listarFuentes } from "../prompts";
import {
  TIMEOUT_POR_DEFECTO_MS,
  type ConfiguracionIA, type DocumentoEntrada, type PeticionAnalisis,
  type PeticionExtraccion, type PeticionRedaccion, type ProveedorIA,
} from "../tipos";

/** Trozo de contenido enviado al modelo: texto, imagen o documento. */
export type Bloque =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; mime: string; base64: string }
  | { tipo: "documento"; nombre: string; mime: string; base64: string };

export function documentoABloque(doc: DocumentoEntrada): Bloque {
  const base64 = bufferABase64(doc.contenido);
  return doc.mime.startsWith("image/")
    ? { tipo: "imagen", mime: doc.mime, base64 }
    : { tipo: "documento", nombre: doc.nombre, mime: doc.mime, base64 };
}

type RespuestaCruda = { contenido: string; modelo: string };

export abstract class ProveedorBase implements ProveedorIA {
  abstract readonly nombre: string;

  constructor(protected readonly config: ConfiguracionIA) {
    if (!config.apiKey) throw new ErrorIA("no_autorizado", "API key vacía");
  }

  /** Única pieza específica de cada vendedor. */
  protected abstract completar(opciones: {
    modelo: string;
    sistema: string;
    bloques: Bloque[];
    jsonEstricto: boolean;
  }): Promise<RespuestaCruda>;

  /** `fetch` con timeout y traducción de fallos de red a ErrorIA. */
  protected async peticion(url: string, init: RequestInit): Promise<Response> {
    const ms = this.config.timeoutMs ?? TIMEOUT_POR_DEFECTO_MS;
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: control.signal });
    } catch (e) {
      const abortado = e instanceof Error && e.name === "AbortError";
      throw new ErrorIA(
        "no_disponible",
        abortado ? `timeout tras ${ms} ms` : String(e),
      );
    } finally {
      clearTimeout(temporizador);
    }
  }

  async extraer({ documento }: PeticionExtraccion): Promise<ResultadoExtraccion> {
    if (documento.contenido.byteLength === 0) {
      throw new ErrorIA("documento_invalido", "documento vacío");
    }

    const { contenido, modelo } = await this.completar({
      modelo: this.config.modeloExtraccion,
      sistema: SISTEMA_EXTRACCION,
      jsonEstricto: true,
      bloques: [
        {
          tipo: "texto",
          texto:
            "Extrae los datos del siguiente expediente sancionador. Devuelve solo el JSON indicado.",
        },
        documentoABloque(documento),
      ],
    });

    const salida = extraerJson<{
      texto_documento?: unknown;
      ocr_utilizado?: unknown;
      campos?: unknown;
      avisos?: unknown;
    }>(contenido);

    return {
      // Se recorta: el texto completo de un PDF largo no cabe cómodamente en
      // una columna y nadie lo lee entero.
      texto_documento: String(salida.texto_documento ?? "").slice(0, 100_000),
      ocr_utilizado: Boolean(salida.ocr_utilizado),
      campos: normalizarCampos(salida.campos),
      avisos: Array.isArray(salida.avisos) ? salida.avisos.map(String) : [],
      modelo,
    };
  }

  async analizar({ contexto, fuentes }: PeticionAnalisis): Promise<ResultadoAnalisis> {
    const { contenido, modelo } = await this.completar({
      modelo: this.config.modeloAnalisis,
      sistema: SISTEMA_ANALISIS,
      jsonEstricto: true,
      bloques: [
        {
          tipo: "texto",
          texto: `FUENTES VERIFICADAS DISPONIBLES:\n${listarFuentes(fuentes)}\n\nEXPEDIENTE:\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
    });
    return normalizarAnalisis(extraerJson<unknown>(contenido), modelo);
  }

  async redactar({ tipo, contexto, fuentes }: PeticionRedaccion): Promise<ResultadoRedaccion> {
    const soloNormas = fuentes
      .map((f) => `- ${f.norm}${f.article ? `, ${f.article}` : ""}${f.section ? ` (${f.section})` : ""}`)
      .join("\n");

    const { contenido, modelo } = await this.completar({
      modelo: this.config.modeloAnalisis,
      sistema: SISTEMA_BORRADOR,
      jsonEstricto: false,
      bloques: [
        {
          tipo: "texto",
          texto: `TIPO DE ESCRITO: ${tipo}\n\nFUENTES VERIFICADAS:\n${soloNormas}\n\nEXPEDIENTE:\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
    });

    // El escrito es texto plano: no se parsea, pero sí se exige que exista.
    if (!contenido.trim()) throw new ErrorIA("sin_contenido");
    return { contenido, modelo };
  }
}
