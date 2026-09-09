/** Generación de documentos con formato profesional (Arial). */

const ESCAPES: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;" };

export function escaparHtml(texto: string) {
  return texto.replace(/[<>&]/g, (c) => ESCAPES[c] ?? c);
}

/** Estilos base de todos los documentos generados: Arial 11 pt, interlineado 1,15. */
export const ESTILOS_DOCUMENTO = `
  @page { size: A4; margin: 2.5cm 2.5cm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.15;
    color: #111111;
    text-align: justify;
    margin: 0;
  }
  p { margin: 0 0 8pt; }
  p.espacio { margin: 0 0 11pt; }
  h1 { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; font-weight: bold; text-align: left; margin: 0 0 12pt; }
  h2 { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; font-weight: bold; text-align: left; margin: 14pt 0 6pt; }
`;

function esTitulo(linea: string) {
  const t = linea.trim();
  if (t.length < 3 || t.length > 90) return false;
  return t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t);
}

/** Convierte el texto plano del escrito en HTML con jerarquía tipográfica Arial. */
export function cuerpoHtmlDocumento(texto: string) {
  const lineas = texto.split("\n");
  let primerTituloUsado = false;
  return lineas
    .map((linea) => {
      const t = linea.trim();
      if (!t) return `<p class="espacio">&nbsp;</p>`;
      if (esTitulo(t)) {
        if (!primerTituloUsado) {
          primerTituloUsado = true;
          return `<h1>${escaparHtml(t)}</h1>`;
        }
        return `<h2>${escaparHtml(t)}</h2>`;
      }
      return `<p>${escaparHtml(linea)}</p>`;
    })
    .join("");
}

export function documentoHtml(titulo: string, texto: string) {
  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<title>${escaparHtml(titulo)}</title>` +
    `<style>${ESTILOS_DOCUMENTO}</style></head>` +
    `<body>${cuerpoHtmlDocumento(texto)}</body></html>`
  );
}
