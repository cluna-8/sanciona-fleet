/**
 * Proveedor Google Gemini (API nativa `generateContent`).
 *
 * Es el camino de menos fricción desde Lovable: el monolito ya usaba
 * `google/gemini-*` a través de su pasarela, así que el comportamiento del
 * modelo es el mismo y solo cambia quién factura.
 */
import { ErrorIA, codigoDesdeStatus } from "../errores";
import { ProveedorBase, type Bloque } from "./base";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type ParteGoogle =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function aParte(b: Bloque): ParteGoogle {
  if (b.tipo === "texto") return { text: b.texto };
  // Gemini trata imágenes y PDFs igual: inline_data con su MIME.
  return { inline_data: { mime_type: b.mime, data: b.base64 } };
}

export class ProveedorGoogle extends ProveedorBase {
  readonly nombre = "google";

  protected async completar(o: {
    modelo: string; sistema: string; bloques: Bloque[]; jsonEstricto: boolean;
  }) {
    const url = `${BASE}/${encodeURIComponent(o.modelo)}:generateContent`;

    const respuesta = await this.peticion(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: o.sistema }] },
        contents: [{ role: "user", parts: o.bloques.map(aParte) }],
        generationConfig: o.jsonEstricto ? { response_mime_type: "application/json" } : {},
      }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => "");
      throw new ErrorIA(codigoDesdeStatus(respuesta.status), `${respuesta.status}: ${cuerpo.slice(0, 500)}`);
    }

    const datos = (await respuesta.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      modelVersion?: string;
    };

    // Gemini puede partir la respuesta en varias `parts`: se concatenan.
    const contenido = (datos.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");

    if (!contenido) throw new ErrorIA("sin_contenido");
    return { contenido, modelo: datos.modelVersion ?? o.modelo };
  }
}
