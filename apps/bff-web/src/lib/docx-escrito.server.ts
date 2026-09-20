/**
 * Generación de .docx real para los escritos (RF-BORRADOR-4, hallazgo M-1).
 *
 * Sustituye el Blob HTML con extensión `.doc` (Word lo abría como HTML, pero
 * era una mentira de formato) por un OOXML real generado con la lib `docx`.
 * Libre JS pura bundleable: `Packer.toBuffer` no toca el filesystem, requisito
 * del runtime de prod (Bun 1.4 + bundle Nitro sin node_modules).
 *
 * Paridad tipográfica con el HTML antiguo: Arial 11 pt (22 half-points),
 * párrafos justificados, márgenes 2,5 cm (1417 twips), títulos bold 14/12 pt.
 */
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import type { BloqueEscrito, CabeceraEscrito } from "./escrito";

const FUENTE = "Arial";
const TAM_TEXTO = 22; // half-points: 22 = 11 pt
const TAM_TITULO = 28; // 14 pt
const TAM_SUBTITULO = 24; // 12 pt
const MARGEN_TWIPS = 1417; // 2,5 cm

function parrafo(
  texto: string,
  opciones: {
    bold?: boolean;
    tamanio?: number;
    justificado?: boolean;
    spacing?: { before?: number; after?: number };
  } = {},
): Paragraph {
  // exactOptionalPropertyTypes: los opcionales se inyectan por spread, no con
  // `cond ? x : undefined`.
  return new Paragraph({
    ...(opciones.justificado ? { alignment: AlignmentType.JUSTIFIED } : {}),
    ...(opciones.spacing ? { spacing: opciones.spacing } : {}),
    children: [
      new TextRun({
        text: texto,
        bold: opciones.bold ?? false,
        font: FUENTE,
        size: opciones.tamanio ?? TAM_TEXTO,
      }),
    ],
  });
}

export async function generarDocxEscrito(datos: {
  bloques: BloqueEscrito[];
  cabecera: CabeceraEscrito;
  titulo: string;
}): Promise<Buffer> {
  const { cabecera } = datos;

  // Cabecera de empresa como párrafos iniciales (el .docx no lleva página de portada).
  const cabeceraParrafos: Paragraph[] = [];
  if (cabecera.organizacion) cabeceraParrafos.push(parrafo(cabecera.organizacion, { bold: true }));
  const lineaCif = [cabecera.cif ? `CIF: ${cabecera.cif}` : null, cabecera.direccion]
    .filter((trozo): trozo is string => Boolean(trozo))
    .join(" · ");
  if (lineaCif) cabeceraParrafos.push(parrafo(lineaCif));
  const lineaExpediente = [
    cabecera.expediente ? `Expediente: ${cabecera.expediente}` : null,
    cabecera.fecha ? `Fecha: ${cabecera.fecha}` : null,
  ]
    .filter((trozo): trozo is string => Boolean(trozo))
    .join(" · ");
  if (lineaExpediente) cabeceraParrafos.push(parrafo(lineaExpediente));

  const cuerpo = datos.bloques.map((bloque) => {
    if (bloque.tipo === "espacio") return new Paragraph({ children: [] });
    if (bloque.tipo === "titulo")
      return parrafo(bloque.texto, { bold: true, tamanio: TAM_TITULO, spacing: { after: 240 } });
    if (bloque.tipo === "subtitulo")
      return parrafo(bloque.texto, {
        bold: true,
        tamanio: TAM_SUBTITULO,
        spacing: { before: 280, after: 120 },
      });
    return parrafo(bloque.texto, { justificado: true, spacing: { after: 160 } });
  });

  const documento = new Document({
    title: datos.titulo,
    creator: "Sanciona Fleet",
    styles: { default: { document: { run: { font: FUENTE, size: TAM_TEXTO } } } },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGEN_TWIPS,
              right: MARGEN_TWIPS,
              bottom: MARGEN_TWIPS,
              left: MARGEN_TWIPS,
            },
          },
        },
        children: [...cabeceraParrafos, ...cuerpo],
      },
    ],
  });
  return Packer.toBuffer(documento);
}
