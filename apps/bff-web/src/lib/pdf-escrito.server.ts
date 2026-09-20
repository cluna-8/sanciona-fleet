/**
 * Generación de PDF real para los escritos (RF-BORRADOR-3, hallazgo M-1).
 *
 * Sustituye el `window.print()` sobre HTML por un binario PDF generado en
 * servidor con pdf-lib. Elección de librería (ADR implícito en el plan de
 * export): el runtime de prod es Bun 1.4 sobre un bundle Nitro SIN
 * node_modules (`Dockerfile.prod`), así que la librería debe ser JS puro
 * bundleable — pdfkit descartado por cargar .afm del disco; pdf-lib es
 * zero-deps.
 *
 * Diseño heredado de los ESTILOS_DOCUMENTO del HTML antiguo (lib/documento.ts,
 * eliminado en esta rama): A4, márgenes 2,5 cm, Arial→Helvetica 11 pt,
 * interlineado ~1,15, títulos bold 14/12 pt. La justificación del HTML no tiene
 * equivalente directo en pdf-lib: los párrafos van alineados a la izquierda.
 *
 * Todo el texto pasa por `sanearTextoPdf` (escrito.ts): pdf-lib LANZA al
 * codificar caracteres fuera de WinAnsi (emoji, CJK…), y los escritos vienen
 * de un LLM que puede colar alguno.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { sanearTextoPdf, type BloqueEscrito, type CabeceraEscrito } from "./escrito";

const A4 = { ancho: 595.28, alto: 841.89 } as const;
const MARGEN = 70.87; // 2,5 cm en puntos
const TAM_TEXTO = 11;
const TAM_TITULO = 14;
const TAM_SUBTITULO = 12;
const TAM_CABECERA = 9;
const COLOR_TEXTO = rgb(17 / 255, 17 / 255, 17 / 255); // #111111
const COLOR_LINEA = rgb(0.75, 0.75, 0.75);

export async function generarPdfEscrito(datos: {
  bloques: BloqueEscrito[];
  cabecera: CabeceraEscrito;
  titulo: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(datos.titulo);
  doc.setProducer("Sanciona Fleet");
  const texto = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const peque = await doc.embedFont(StandardFonts.Helvetica);

  // Probe de codificabilidad con caché por carácter: pdf-lib lanza al codificar
  // un carácter fuera de WinAnsi, y el mismo carácter aparece muchas veces.
  const cache = new Map<string, boolean>();
  const codificable = (caracter: string): boolean => {
    let ok = cache.get(caracter);
    if (ok === undefined) {
      try {
        texto.encodeText(caracter);
        ok = true;
      } catch {
        ok = false;
      }
      cache.set(caracter, ok);
    }
    return ok;
  };
  const sanea = (t: string) => sanearTextoPdf(t, codificable);

  const anchoUtil = A4.ancho - 2 * MARGEN;
  let pagina = doc.addPage([A4.ancho, A4.alto]);
  let y = A4.alto - MARGEN;

  const nuevaPagina = () => {
    pagina = doc.addPage([A4.ancho, A4.alto]);
    y = A4.alto - MARGEN;
  };
  const asegurarEspacio = (alto: number) => {
    if (y - alto < MARGEN) nuevaPagina();
  };

  /** Envuelve una línea al ancho útil; parte por caracteres las palabras largas (URLs). */
  const envolver = (linea: string, tamanio: number): string[] => {
    const ancho = (t: string) => texto.widthOfTextAtSize(t, tamanio);
    if (!linea) return [""];
    const lineas: string[] = [];
    let actual = "";
    for (const palabra of linea.split(" ")) {
      if (!actual) actual = palabra;
      else if (ancho(`${actual} ${palabra}`) <= anchoUtil) actual += ` ${palabra}`;
      else {
        lineas.push(actual);
        actual = palabra;
      }
      // Palabra más ancha que la línea: partirla por caracteres.
      while (ancho(actual) > anchoUtil && actual.length > 1) {
        let corte = 1;
        while (corte < actual.length - 1 && ancho(actual.slice(0, corte + 1)) <= anchoUtil) corte++;
        lineas.push(actual.slice(0, corte));
        actual = actual.slice(corte);
      }
    }
    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [""];
  };

  const escribir = (lineas: string[], tamanio: number, bold: boolean, extraDespues: number) => {
    const fuente = bold ? negrita : texto;
    const alto = Math.round(tamanio * 1.18); // interlineado ~1,15 como el CSS antiguo
    for (const linea of lineas) {
      asegurarEspacio(alto);
      if (linea)
        pagina.drawText(linea, { x: MARGEN, y, size: tamanio, font: fuente, color: COLOR_TEXTO });
      y -= alto;
    }
    y -= extraDespues;
  };

  // Cabecera de empresa, solo en la primera página.
  const { cabecera } = datos;
  const lineaCif = [cabecera.cif ? `CIF: ${cabecera.cif}` : null, cabecera.direccion]
    .filter((trozo): trozo is string => Boolean(trozo))
    .join(" · ");
  const lineaExpediente = [
    cabecera.expediente ? `Expediente: ${cabecera.expediente}` : null,
    cabecera.fecha ? `Fecha: ${cabecera.fecha}` : null,
  ]
    .filter((trozo): trozo is string => Boolean(trozo))
    .join(" · ");
  if (cabecera.organizacion)
    escribir(envolver(sanea(cabecera.organizacion), TAM_TEXTO), TAM_TEXTO, true, 2);
  if (lineaCif) escribir(envolver(sanea(lineaCif), TAM_CABECERA), TAM_CABECERA, false, 1);
  if (lineaExpediente)
    escribir(envolver(sanea(lineaExpediente), TAM_CABECERA), TAM_CABECERA, false, 0);
  if (cabecera.organizacion || lineaCif || lineaExpediente) {
    pagina.drawLine({
      start: { x: MARGEN, y: y - 4 },
      end: { x: A4.ancho - MARGEN, y: y - 4 },
      thickness: 0.75,
      color: COLOR_LINEA,
    });
    y -= 18;
  }

  // Cuerpo: paridad con el CSS antiguo (h1 margin-bottom 12pt, h2 14/6, p 8).
  for (const bloque of datos.bloques) {
    if (bloque.tipo === "espacio") {
      y -= TAM_TEXTO;
      continue;
    }
    const tamanio =
      bloque.tipo === "titulo"
        ? TAM_TITULO
        : bloque.tipo === "subtitulo"
          ? TAM_SUBTITULO
          : TAM_TEXTO;
    const lineas = envolver(sanea(bloque.texto), tamanio);
    if (bloque.tipo === "titulo") escribir(lineas, tamanio, true, 12);
    else if (bloque.tipo === "subtitulo") {
      y -= 14; // margin-top del h2 antiguo
      escribir(lineas, tamanio, true, 6);
    } else escribir(lineas, tamanio, false, 8);
  }

  // Pie: número de página en todas, ahora que ya se conoce el total.
  const paginas = doc.getPages();
  paginas.forEach((p, indice) => {
    const pie = `Página ${indice + 1} de ${paginas.length}`;
    const anchoPie = peque.widthOfTextAtSize(pie, TAM_CABECERA);
    p.drawText(pie, {
      x: (A4.ancho - anchoPie) / 2,
      y: 30,
      size: TAM_CABECERA,
      font: peque,
      color: COLOR_LINEA,
    });
  });

  return doc.save();
}
