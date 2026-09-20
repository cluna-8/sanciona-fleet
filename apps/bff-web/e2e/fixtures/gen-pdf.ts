/**
 * Genera un PDF mínimo y válido con texto de una sanción de ejemplo, para el
 * spec CU-01 (alta desde documento). Lo lee el modelo multimodal de OpenRouter.
 *
 * Uso: bun run e2e/fixtures/gen-pdf.ts  ->  e2e/fixtures/sancion-ejemplo.pdf
 */
import { writeFileSync } from "node:fs";

const LINEAS = [
  "EXPEDIENTE: TEST-CU01-2026-0001",
  "ORGANISMO: DGT - Jefatura Provincial de Trafico",
  "MATRICULA: 9999 PAR",
  "FECHA DE NOTIFICACION: 2026-09-15",
  "FECHA DE INFRACCION: 2026-09-10",
  "IMPORTE ORIGINAL: 200.00 EUR",
  "IMPORTE CON REDUCCION: 100.00 EUR",
  "PUNTOS: 2",
  "INFRACCION: Velocidad excesiva en via urbana",
  "CATEGORIA: Trafico",
];

// Escapa paréntesis/backslash para strings PDF
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Content stream: primera línea en (50, 800), luego saltos de -18
const y = 800;
const contenido =
  "BT /F1 13 Tf 50 " +
  y +
  " Td (" +
  esc(LINEAS[0]!) +
  ") Tj " +
  LINEAS.slice(1)
    .map((l) => `0 -18 Td (${esc(l)}) Tj`)
    .join(" ") +
  " ET";
const stream = contenido;
const streamBytes = Buffer.from(stream, "latin1");

const objetos: string[] = [];
objetos.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
objetos.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
objetos.push(
  "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
);
objetos.push(
  `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
);
objetos.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

let pdf = "%PDF-1.4\n";
const offsets: number[] = [];
for (const obj of objetos) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += obj;
}
const xrefStart = Buffer.byteLength(pdf, "latin1");
let xref = "xref\n0 6\n0000000000 65535 f \n";
for (const off of offsets) {
  xref += off.toString().padStart(10, "0") + " 00000 n \n";
}
pdf += xref;
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

writeFileSync("e2e/fixtures/sancion-ejemplo.pdf", Buffer.from(pdf, "latin1"));
console.log(
  "generado e2e/fixtures/sancion-ejemplo.pdf",
  Buffer.from(pdf, "latin1").length,
  "bytes",
);
