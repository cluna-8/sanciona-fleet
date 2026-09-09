/**
 * Los fallbacks son la red de seguridad ante un modelo que devuelve basura.
 * La regla que se verifica aquí: ante la duda SIEMPRE se elige el valor más
 * conservador, nunca el más optimista.
 */
import { describe, expect, it } from "bun:test";
import {
  camposCriticosDudosos, normalizarAnalisis, normalizarCampos,
  normalizarConfianza, normalizarRecomendacion, normalizarSemaforo,
} from "../src/normalizar";

describe("fallbacks conservadores", () => {
  it("una confianza inventada se degrada a Bajo", () => {
    expect(normalizarConfianza("altísimo")).toBe("Bajo");
    expect(normalizarConfianza("high")).toBe("Bajo");
    expect(normalizarConfianza(undefined)).toBe("Bajo");
    expect(normalizarConfianza("Alto")).toBe("Alto");
  });

  it("un semáforo inválido se degrada a Gris, nunca a Verde", () => {
    expect(normalizarSemaforo("Azul")).toBe("Gris");
    expect(normalizarSemaforo(null)).toBe("Gris");
    expect(normalizarSemaforo("Rojo")).toBe("Rojo");
  });

  it("una recomendación inválida cae en Revisar, que no compromete a nada", () => {
    expect(normalizarRecomendacion("Recurrir seguro")).toBe("Revisar");
    expect(normalizarRecomendacion("Pagar con reducción")).toBe("Pagar con reducción");
  });
});

describe("normalización de campos extraídos", () => {
  it("descarta claves que no están en el catálogo", () => {
    const campos = normalizarCampos({
      matricula: { valor: "1234 KLM", confianza: "Alto", fuente: "matrícula 1234 KLM" },
      campo_inventado: { valor: "x", confianza: "Alto" },
    });
    expect(Object.keys(campos)).toEqual(["matricula"]);
  });

  it("descarta valores vacíos o nulos en vez de guardarlos", () => {
    const campos = normalizarCampos({
      matricula: { valor: null, confianza: "Alto" },
      conductor_dni: { valor: "", confianza: "Alto" },
      puntos: { valor: 0, confianza: "Alto" },
    });
    // 0 es un valor legítimo (cero puntos); null y "" no lo son.
    expect(Object.keys(campos)).toEqual(["puntos"]);
    expect(campos["puntos"]?.valor).toBe(0);
  });

  it("recorta la fuente a 120 caracteres", () => {
    const campos = normalizarCampos({
      matricula: { valor: "1234 KLM", confianza: "Alto", fuente: "x".repeat(300) },
    });
    expect(campos["matricula"]?.fuente).toHaveLength(120);
  });

  it("conserva números y booleanos sin convertirlos a texto", () => {
    const campos = normalizarCampos({
      importe_original: { valor: 300.5, confianza: "Alto" },
      requiere_identificacion_conductor: { valor: true, confianza: "Alto" },
    });
    expect(campos["importe_original"]?.valor).toBe(300.5);
    expect(campos["requiere_identificacion_conductor"]?.valor).toBe(true);
  });

  it("no revienta si el modelo devuelve algo que no es un objeto", () => {
    expect(normalizarCampos(null)).toEqual({});
    expect(normalizarCampos("texto suelto")).toEqual({});
    expect(normalizarCampos([1, 2, 3])).toEqual({});
  });
});

describe("campos críticos dudosos", () => {
  it("señala solo los campos críticos con confianza baja", () => {
    const campos = normalizarCampos({
      matricula: { valor: "1234 KLM", confianza: "Bajo" },
      importe_original: { valor: 300, confianza: "Alto" },
      marca: { valor: "Volvo", confianza: "Bajo" }, // no es crítico
    });
    expect(camposCriticosDudosos(campos)).toEqual(["matricula"]);
  });
});

describe("normalización del análisis", () => {
  it("una respuesta vacía produce el análisis más cauto posible", () => {
    const a = normalizarAnalisis({}, "modelo-x");
    expect(a.semaforo).toBe("Gris");
    expect(a.nivel_confianza).toBe("Bajo");
    expect(a.recomendacion).toBe("Revisar");
    expect(a.factores).toEqual([]);
    expect(a.modelo).toBe("modelo-x");
  });

  it("descarta factores sin texto y asigna tipo por defecto al inválido", () => {
    const a = normalizarAnalisis(
      { factores: [{ texto: "Plazo vencido", tipo: "plazo" }, { texto: "", tipo: "plazo" }, { texto: "Otro", tipo: "inventado" }] },
      "m",
    );
    expect(a.factores).toEqual([
      { texto: "Plazo vencido", tipo: "plazo" },
      { texto: "Otro", tipo: "procedimiento" },
    ]);
  });

  it("tolera listas que llegan como null", () => {
    const a = normalizarAnalisis({ incoherencias: null, checklist: undefined }, "m");
    expect(a.incoherencias).toEqual([]);
    expect(a.checklist).toEqual([]);
  });
});
