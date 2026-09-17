import { parseImporte } from "@/shared/lib/formato";

/**
 * Tipos y helpers para los campos extraídos de un documento sancionador.
 * Extraídos de `lib/expediente.functions.ts` (move-only, Etapa 3.8).
 */

export type ValorCampo = string | number | boolean | null;
export type Campo = { valor: ValorCampo; confianza: string; fuente: string | null };
export type Campos = Record<string, Campo>;

export const CONFIANZAS = new Set(["Alto", "Medio", "Bajo"]);

export function normalizarMatricula(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function texto(campos: Campos, clave: string): string | null {
  const v = campos[clave]?.valor;
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export function numero(campos: Campos, clave: string): number | null {
  return parseImporte(campos[clave]?.valor);
}

export function fecha(campos: Campos, clave: string): string | null {
  const v = texto(campos, clave);
  if (!v) return null;
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

export function booleano(campos: Campos, clave: string): boolean {
  const v = campos[clave]?.valor;
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "sí" || s === "si";
}
