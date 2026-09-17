import { describe, expect, it } from "bun:test";
import { normalizarCampos } from "./normalizar";
import type { Campos } from "./campos";

function campo(valor: string | number | boolean | null, confianza = "Alto"): Campos[string] {
  return { valor, confianza, fuente: null };
}

describe("normalizarCampos", () => {
  it("convierte el flag de identificación del conductor a texto presentable", () => {
    const casos: Array<[Campos[string]["valor"], string]> = [
      [true, "Sí"],
      [false, "No"],
      ["true", "Sí"],
      ["sí", "Sí"],
      ["SÍ", "Sí"],
      ["si", "Pendiente de confirmar"],
      ["false", "No"],
      ["no", "No"],
      [null, "Pendiente de confirmar"],
    ];
    for (const [entrada, esperado] of casos) {
      const salida = normalizarCampos({
        requiere_identificacion_conductor: campo(entrada, "Bajo"),
      });
      expect(salida["requiere_identificacion_conductor"]?.valor).toBe(esperado);
    }
  });

  it("deduce el tipo de infracción concreto a partir de la descripción cuando viene genérico", () => {
    const salida = normalizarCampos({
      tipo_infraccion: campo("Otra"),
      descripcion: campo("Exceso de velocidad detectado por radar"),
    });
    expect(salida["tipo_infraccion"]?.valor).toBe("Exceso de velocidad");
    expect(salida["tipo_infraccion"]?.confianza).toBe("Medio");
    expect(salida["tipo_infraccion"]?.fuente).toBe("Deducido de los hechos");
  });

  it("no sobreescribe un tipo de infracción ya concreto", () => {
    const salida = normalizarCampos({
      tipo_infraccion: campo("Estacionamiento indebido"),
    });
    expect(salida["tipo_infraccion"]?.valor).toBe("Estacionamiento indebido");
  });

  it("sugiere la categoría asociada al tipo final cuando la actual no es válida", () => {
    const salida = normalizarCampos({
      tipo_infraccion: campo("Exceso de velocidad"),
      categoria: campo(""),
    });
    expect(salida["categoria"]?.valor).toBe("Velocidad");
  });

  it("no cambia una categoría ya válida", () => {
    const salida = normalizarCampos({
      tipo_infraccion: campo("Exceso de velocidad"),
      categoria: campo("Velocidad"),
    });
    expect(salida["categoria"]?.valor).toBe("Velocidad");
  });

  it("preserva los campos que no toca", () => {
    const salida = normalizarCampos({
      numero_expediente: campo("EXP-2026-1"),
      importe_original: campo(200),
    });
    expect(salida["numero_expediente"]?.valor).toBe("EXP-2026-1");
    expect(salida["importe_original"]?.valor).toBe(200);
  });
});
