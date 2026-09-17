import { describe, expect, it } from "bun:test";
import { estadoInicial, pasoDesdeFase, wizardReducer, type EstadoWizard } from "./wizardReducer";
import type { Campos } from "./campos";

function base(): EstadoWizard {
  return estadoInicial("Notificación de la sanción");
}

describe("wizardReducer", () => {
  it("ELEGIR_ARCHIVO reinicia el estado de proceso al inicial", () => {
    const s = wizardReducer(base(), { type: "ELEGIR_ARCHIVO", archivo: new File(["a"], "x.pdf") });
    expect(s.fase).toBe("inicial");
    expect(s.archivo?.name).toBe("x.pdf");
    expect(s.estado).toBe("");
  });

  it("recorre el flujo feliz: subiendo → procesando → revisando", () => {
    let s = base();
    s = wizardReducer(s, { type: "ELEGIR_ARCHIVO", archivo: new File(["a"], "x.pdf") });
    s = wizardReducer(s, { type: "INICIAR_PROCESADO" });
    expect(s.fase).toBe("subiendo");
    expect(s.estado).toBe("Documento recibido");
    s = wizardReducer(s, { type: "REGISTRAR_EXTRACCION", extractionId: "ext-1" });
    expect(s.fase).toBe("procesando");
    expect(s.extractionId).toBe("ext-1");
    const campos: Campos = { matricula: { valor: "1234ABC", confianza: "Alto", fuente: null } };
    s = wizardReducer(s, {
      type: "PROCESADO_OK",
      campos,
      avisos: ["Vehículo no localizado en la flota registrada."],
      estado: "Revisión requerida",
      sugerencias: {
        vehicleId: "v1",
        vehiculoTexto: "1234ABC",
        driverId: null,
        conductorTexto: null,
      },
    });
    expect(s.fase).toBe("revisando");
    expect(s.estado).toBe("Revisión requerida");
    expect(s.vehiculo).toBe("v1");
    expect(s.conductor).toBe("__ninguno__");
    expect(s.confirmado).toBe(false);
    expect(s.avisos).toHaveLength(1);
  });

  it("PROCESADO_PENDIENTE deja la fase en procesando (IA no disponible)", () => {
    const s = wizardReducer(base(), {
      type: "PROCESADO_PENDIENTE",
      estado: "Documento subido correctamente. Pendiente de procesamiento.",
    });
    expect(s.fase).toBe("procesando");
    expect(pasoDesdeFase(s.fase)).toBe(1);
  });

  it("PROCESADO_ERROR vuelve al paso inicial", () => {
    const s = wizardReducer(
      { ...base(), fase: "procesando" },
      { type: "PROCESADO_ERROR", estado: "No se ha podido subir el documento" },
    );
    expect(s.fase).toBe("inicial");
    expect(pasoDesdeFase(s.fase)).toBe(0);
    expect(s.estado).toBe("No se ha podido subir el documento");
  });

  it("ACTUALIZAR_CAMPO actualiza el valor preservando confianza/fuente existentes", () => {
    let s: EstadoWizard = {
      ...base(),
      fase: "revisando",
      campos: { matricula: { valor: "1234ABC", confianza: "Bajo", fuente: "OCR" } },
      camposOriginales: { matricula: { valor: "1234ABC", confianza: "Bajo", fuente: "OCR" } },
    };
    s = wizardReducer(s, { type: "ACTUALIZAR_CAMPO", clave: "matricula", valor: "9999ZZZ" });
    expect(s.campos["matricula"]?.valor).toBe("9999ZZZ");
    expect(s.campos["matricula"]?.confianza).toBe("Bajo");
    expect(s.campos["matricula"]?.fuente).toBe("OCR");
  });

  it("ACTUALIZAR_CAMPO rellena confianza/fuente por defecto para campos nuevos", () => {
    let s: EstadoWizard = { ...base(), fase: "revisando" };
    s = wizardReducer(s, { type: "ACTUALIZAR_CAMPO", clave: "lugar", valor: "Madrid" });
    expect(s.campos["lugar"]?.confianza).toBe("Alto");
    expect(s.campos["lugar"]?.fuente).toBeNull();
  });

  it("CONFIRMAR_DISCREPANCIA alterna el flag de confirmación", () => {
    let s: EstadoWizard = { ...base(), fase: "revisando" };
    s = wizardReducer(s, { type: "CONFIRMAR_DISCREPANCIA", confirmado: true });
    expect(s.confirmado).toBe(true);
    s = wizardReducer(s, { type: "CONFIRMAR_DISCREPANCIA", confirmado: false });
    expect(s.confirmado).toBe(false);
  });

  it("el flujo de creación pasa a creando y luego creado", () => {
    let s: EstadoWizard = { ...base(), fase: "revisando" };
    s = wizardReducer(s, { type: "INICIAR_CREACION" });
    expect(s.fase).toBe("creando");
    expect(pasoDesdeFase(s.fase)).toBe(2);
    s = wizardReducer(s, { type: "CREADO" });
    expect(s.fase).toBe("creado");
    expect(pasoDesdeFase(s.fase)).toBe(3);
  });

  it("QUITAR_ARCHIVO reinicia todo salvo tipoDoc", () => {
    let s = wizardReducer(base(), { type: "ELEGIR_ARCHIVO", archivo: new File(["a"], "x.pdf") });
    s = wizardReducer(s, { type: "REGISTRAR_EXTRACCION", extractionId: "ext-1" });
    s = wizardReducer(s, { type: "QUITAR_ARCHIVO" });
    expect(s.archivo).toBeNull();
    expect(s.extractionId).toBeNull();
    expect(s.fase).toBe("inicial");
    expect(s.tipoDoc).toBe("Notificación de la sanción");
  });
});

describe("pasoDesdeFase", () => {
  it("mapea cada fase al paso del stepper", () => {
    expect(pasoDesdeFase("inicial")).toBe(0);
    expect(pasoDesdeFase("subiendo")).toBe(1);
    expect(pasoDesdeFase("procesando")).toBe(1);
    expect(pasoDesdeFase("revisando")).toBe(2);
    expect(pasoDesdeFase("creando")).toBe(2);
    expect(pasoDesdeFase("creado")).toBe(3);
    expect(pasoDesdeFase("error")).toBe(0);
  });
});
