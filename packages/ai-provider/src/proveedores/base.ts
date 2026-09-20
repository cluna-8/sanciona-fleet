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
  REINTENTOS_POR_DEFECTO,
  REINTENTO_TOPE_MS,
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

type RespuestaCruda = {
  contenido: string;
  modelo: string;
  /** Uso informado por el proveedor, si existe (para el log de gasto). */
  tokens?: { entrada: number; salida: number };
};

/** El 429 de un proveedor transitorio no debe marcar un expediente como roto. */
const dormir = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

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

  /**
   * `completar` con reintentos ante errores transitorios (A-3a): hasta
   * `maxIntentosExtra` reintentos extra con backoff exponencial `baseMs·2^n`
   * y jitter ±25 %, respetando un `Retry-After` del proveedor si es mayor.
   *
   * No se reintentan los códigos no reintentables (`sin_credito`,
   * `no_autorizado`, `documento_invalido`…): reintentarlos solo quema cuota.
   * Ninguna espera supera `REINTENTO_TOPE_MS`: un `Retry-After` enorme hace
   * fallar YA con el mensaje amigable, en vez de colgar la petición.
   */
  private async completarConReintentos(opciones: {
    modelo: string;
    sistema: string;
    bloques: Bloque[];
    jsonEstricto: boolean;
  }): Promise<RespuestaCruda> {
    const { maxIntentosExtra, baseMs } = this.config.reintentos ?? REINTENTOS_POR_DEFECTO;
    for (let intento = 0; ; intento++) {
      try {
        return await this.completar(opciones);
      } catch (e) {
        if (!(e instanceof ErrorIA) || !e.reintentable || intento >= maxIntentosExtra) throw e;
        const backoff = baseMs * 2 ** intento;
        const espera = Math.max(backoff, e.reintentarTrasMs ?? 0);
        if (espera > REINTENTO_TOPE_MS) throw e;
        const jitter = 1 + (Math.random() * 0.5 - 0.25); // ±25 %
        await dormir(Math.round(espera * jitter));
      }
    }
  }

  /**
   * Puente temporal de la migración (ADR 0003): llamada cruda al modelo.
   * Delega en `completar`; los `bloques` llegan como `unknown` desde
   * `expediente.server.ts` y se devuelven al tipo interno. Retirar cuando los
   * handlers migren a `extraer/analizar/redactar`.
   */
  async llamar(opciones: {
    modelo: string;
    sistema: string;
    bloques: ReadonlyArray<unknown>;
    jsonEstricto?: boolean;
  }): Promise<RespuestaCruda> {
    return this.completarConReintentos({
      modelo: opciones.modelo,
      sistema: opciones.sistema,
      bloques: opciones.bloques as Bloque[],
      jsonEstricto: opciones.jsonEstricto ?? false,
    });
  }

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

    const { contenido, modelo } = await this.completarConReintentos({
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
    const { contenido, modelo } = await this.completarConReintentos({
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

    const { contenido, modelo } = await this.completarConReintentos({
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
