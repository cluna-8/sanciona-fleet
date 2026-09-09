/** Proveedor Anthropic (API de Mensajes). */
import { ErrorIA, codigoDesdeStatus } from "../errores";
import { ProveedorBase, type Bloque } from "./base";

const URL = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
const MAX_TOKENS = 8192;

type ContenidoAnthropic =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

function aContenido(b: Bloque): ContenidoAnthropic {
  if (b.tipo === "texto") return { type: "text", text: b.texto };
  if (b.tipo === "imagen") {
    return { type: "image", source: { type: "base64", media_type: b.mime, data: b.base64 } };
  }
  return { type: "document", source: { type: "base64", media_type: b.mime, data: b.base64 } };
}

export class ProveedorAnthropic extends ProveedorBase {
  readonly nombre = "anthropic";

  protected async completar(o: {
    modelo: string; sistema: string; bloques: Bloque[]; jsonEstricto: boolean;
  }) {
    const respuesta = await this.peticion(URL, {
      method: "POST",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: o.modelo,
        max_tokens: MAX_TOKENS,
        // No hay modo JSON: la instrucción del prompt basta y extraerJson()
        // limpia las vallas ``` si el modelo las añade.
        system: o.sistema,
        messages: [{ role: "user", content: o.bloques.map(aContenido) }],
      }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => "");
      throw new ErrorIA(codigoDesdeStatus(respuesta.status), `${respuesta.status}: ${cuerpo.slice(0, 500)}`);
    }

    const datos = (await respuesta.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      model?: string;
    };
    const contenido = (datos.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    if (!contenido) throw new ErrorIA("sin_contenido");
    return { contenido, modelo: datos.model ?? o.modelo };
  }
}
