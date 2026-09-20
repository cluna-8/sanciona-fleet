/**
 * Diff real entre versiones de un escrito (RF-BORRADOR-5, hallazgo B-6).
 *
 * Wrapper fino sobre `diffLines` de la lib `diff`: el punto único que conoce
 * la librería, para poder cambiar de algoritmo sin tocar la UI. Aplana los
 * hunks multilínea a una entrada por línea, que es lo que `<DiffEscrito>`
 * pinta (y lo que asertan los E2E vía `data-tipo`).
 */
import { diffLines } from "diff";

export type TipoCambioEscrito = "igual" | "anadida" | "eliminada";

export type CambioEscrito = { tipo: TipoCambioEscrito; texto: string };

export function diffEscrito(antes: string, despues: string): CambioEscrito[] {
  const cambios: CambioEscrito[] = [];
  for (const cambio of diffLines(antes, despues)) {
    const tipo: TipoCambioEscrito = cambio.added
      ? "anadida"
      : cambio.removed
        ? "eliminada"
        : "igual";
    // Cada línea del hunk lleva su \n final: se reparte línea a línea para
    // que la UI pinte (y el E2E localice) cada línea con su propio data-tipo.
    const lineas = cambio.value.replace(/\n$/, "").split("\n");
    for (const linea of lineas) cambios.push({ tipo, texto: linea });
  }
  return cambios;
}
