/**
 * Proveedor compatible con la API de OpenAI (`/v1/chat/completions`).
 *
 * Cubre OpenAI, OpenRouter y cualquier pasarela que hable ese dialecto —
 * incluido el propio gateway de Lovable, útil para comparar salidas durante la
 * migración apuntando `urlBase` a él.
 */
import { ErrorIA, codigoDesdeStatus } from "../errores";
import type { ConfiguracionIA } from "../tipos";
import { ProveedorBase, type Bloque } from "./base";

const URL_OPENAI = "https://api.openai.com/v1/chat/completions";

/**
 * `Retry-After` en segundos (forma habitual en los 429). Las fechas HTTP que
 * contempla la RFC se ignoran: el proveedor de referencia (OpenRouter) no las
 * usa y esperar hasta una fecha concreta excede el tope de reintento.
 */
function msDeRetryAfter(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const segundos = Number(valor);
  return Number.isFinite(segundos) && segundos > 0 ? Math.round(segundos * 1000) : undefined;
}

type ContenidoOpenAI =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

function aContenido(b: Bloque): ContenidoOpenAI {
  if (b.tipo === "texto") return { type: "text", text: b.texto };
  if (b.tipo === "imagen") {
    return { type: "image_url", image_url: { url: `data:${b.mime};base64,${b.base64}` } };
  }
  return {
    type: "file",
    file: { filename: b.nombre, file_data: `data:${b.mime};base64,${b.base64}` },
  };
}

export class ProveedorOpenAICompatible extends ProveedorBase {
  readonly nombre: string;
  private readonly url: string;

  constructor(config: ConfiguracionIA) {
    super(config);
    this.url = config.urlBase ?? URL_OPENAI;
    if (config.proveedor === "openai") this.nombre = "openai";
    else if (config.proveedor === "openrouter") this.nombre = "openrouter";
    else this.nombre = `openai-compatible (${new URL(this.url).host})`;
  }

  protected async completar(o: {
    modelo: string; sistema: string; bloques: Bloque[]; jsonEstricto: boolean;
  }) {
    const respuesta = await this.peticion(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: o.modelo,
        messages: [
          { role: "system", content: o.sistema },
          { role: "user", content: o.bloques.map(aContenido) },
        ],
        ...(o.jsonEstricto ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => "");
      // En un 429 el proveedor dice cuánto esperar: la política de reintentos
      // de ProveedorBase lo respeta si supera al backoff propio.
      const reintentarTrasMs =
        respuesta.status === 429 ? msDeRetryAfter(respuesta.headers.get("retry-after")) : undefined;
      throw new ErrorIA(
        codigoDesdeStatus(respuesta.status),
        `${respuesta.status}: ${cuerpo.slice(0, 500)}`,
        reintentarTrasMs,
      );
    }

    const datos = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const contenido = datos.choices?.[0]?.message?.content ?? "";
    if (!contenido) throw new ErrorIA("sin_contenido");
    return {
      contenido,
      modelo: datos.model ?? o.modelo,
      // Uso de tokens cuando el proveedor lo informa (para ai_usage_logs).
      ...(typeof datos.usage?.prompt_tokens === "number"
        ? {
            tokens: {
              entrada: datos.usage.prompt_tokens,
              salida: datos.usage.completion_tokens ?? 0,
            },
          }
        : {}),
    };
  }
}
