import { test, expect } from "bun:test";
import { diffEscrito } from "@/lib/diff-escrito";

// Bloque B del plan de export (RF-BORRADOR-5, B-6): wrapper fino sobre
// diffLines. La UI pinta cada entrada como una línea con data-tipo; los E2E
// dependen de ese contrato.

test("detecta una línea eliminada y una añadida", () => {
  const cambios = diffEscrito("A\nB", "A\nC");
  expect(cambios).toEqual([
    { tipo: "igual", texto: "A" },
    { tipo: "eliminada", texto: "B" },
    { tipo: "anadida", texto: "C" },
  ]);
});

test("con textos idénticos devuelve todo 'igual'", () => {
  const cambios = diffEscrito("HECHOS\nPárrafo uno.", "HECHOS\nPárrafo uno.");
  expect(cambios.map((c) => c.tipo)).toEqual(["igual", "igual"]);
  expect(cambios.every((c) => c.texto !== "")).toBe(true);
});

test("de vacío a texto es todo 'anadida', y de texto a vacío todo 'eliminada'", () => {
  expect(diffEscrito("", "Nueva línea").map((c) => c.tipo)).toEqual(["anadida"]);
  expect(diffEscrito("Vieja línea", "").map((c) => c.tipo)).toEqual(["eliminada"]);
});

test("aplaná hunks multilínea: una entrada por línea, sin saltos en el texto", () => {
  const cambios = diffEscrito("uno\ndos\ntres\ncuatro", "uno\nX\nY\ncuatro");
  // El hunk eliminado abarca "dos\ntres\n" y el añadido "X\nY\n": cada línea
  // debe llegar como entrada propia.
  expect(cambios).toEqual([
    { tipo: "igual", texto: "uno" },
    { tipo: "eliminada", texto: "dos" },
    { tipo: "eliminada", texto: "tres" },
    { tipo: "anadida", texto: "X" },
    { tipo: "anadida", texto: "Y" },
    { tipo: "igual", texto: "cuatro" },
  ]);
  expect(cambios.every((c) => !c.texto.includes("\n"))).toBe(true);
});
