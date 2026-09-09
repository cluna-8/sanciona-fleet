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
    this.nombre = config.proveedor === "openai" ? "openai" : `openai-compatible (${new URL(this.url).host})`;
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
      throw new ErrorIA(codigoDesdeStatus(respuesta.status), `${respuesta.status}: ${cuerpo.slice(0, 500)}`);
    }

    const datos = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const contenido = datos.choices?.[0]?.message?.content ?? "";
    if (!contenido) throw new ErrorIA("sin_contenido");
    return { contenido, modelo: datos.model ?? o.modelo };
  }
}
