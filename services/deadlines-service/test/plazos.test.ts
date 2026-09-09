/**
 * Tests del motor de plazos. Cubren las reglas descritas en
 * PROYECTO-MULTAS-INVENTARIO.md §5.1 y SPEC.md RF-PLAZO-1..2.
 *
 * ⚠️ Estas reglas están pendientes de validación por un abogado
 * administrativista (SPEC.md §8, Bloque 4). Si cambian los días/meses, este
 * archivo debe actualizarse en el mismo commit que `src/plazos.ts`.
 */
import { describe, expect, it } from "bun:test";
import { calcularPlazos } from "../src/plazos";

describe("régimen de tráfico (DGT / Guardia Civil / ayuntamiento)", () => {
  it("calcula pago con reducción a 20 días naturales desde la notificación", () => {
    const [pago] = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2030-01-01",
    });
    expect(pago?.deadline_type).toBe("Pago con reducción");
    expect(pago?.end_date).toBe("2030-01-21");
    expect(pago?.day_type).toBe("naturales");
    expect(pago?.status).toBe("Calculado");
  });

  it("calcula alegaciones a 20 días naturales, régimen fiable", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "Ayuntamiento de Valencia",
      notification_date: "2030-01-01",
    });
    const alegaciones = plazos.find((p) => p.deadline_type === "Alegaciones");
    expect(alegaciones?.end_date).toBe("2030-01-21");
    expect(alegaciones?.status).toBe("Calculado");
  });

  it("solo incluye identificación del conductor si se requiere", () => {
    const sinRequerir = calcularPlazos({
      sanctioning_authority: "Guardia Civil de Tráfico",
      notification_date: "2030-01-01",
      requires_driver_identification: false,
    });
    expect(sinRequerir.some((p) => p.deadline_type === "Identificación del conductor")).toBe(false);

    const requiriendo = calcularPlazos({
      sanctioning_authority: "Guardia Civil de Tráfico",
      notification_date: "2030-01-01",
      requires_driver_identification: true,
    });
    const identificacion = requiriendo.find((p) => p.deadline_type === "Identificación del conductor");
    expect(identificacion).toBeDefined();
    expect(identificacion?.status).toBe("Pendiente de verificación"); // regla no fiable
  });
});

describe("régimen de transporte (Ministerio / Inspección)", () => {
  it("calcula alegaciones a 15 días hábiles, marcado como no fiable", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "Ministerio de Transportes",
      notification_date: "2030-01-01", // jueves
    });
    const alegaciones = plazos.find((p) => p.deadline_type === "Alegaciones");
    expect(alegaciones?.day_type).toBe("hábiles");
    expect(alegaciones?.status).toBe("Pendiente de verificación");
  });

  it("no confunde transporte con tráfico aunque ambas palabras aparezcan", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "Inspección de Transportes",
      notification_date: "2030-01-01",
    });
    expect(plazos.some((p) => p.calculation_basis.includes("art. 94"))).toBe(false);
  });
});

describe("régimen genérico (organismo no reconocido)", () => {
  it("aplica alegaciones a 15 días hábiles como procedimiento administrativo común", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "Otro organismo",
      notification_date: "2030-01-01",
    });
    const alegaciones = plazos.find((p) => p.deadline_type === "Alegaciones");
    expect(alegaciones?.status).toBe("Pendiente de verificación");
  });
});

describe("recurso", () => {
  it("siempre está presente, a 1 mes de la resolución notificada", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2030-01-01",
      resolution_notified_date: "2030-03-10",
    });
    const recurso = plazos.find((p) => p.deadline_type === "Recurso");
    expect(recurso?.end_date).toBe("2030-04-10");
  });

  it("si no hay fecha de resolución, usa la fecha de notificación como base", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2030-01-01",
    });
    const recurso = plazos.find((p) => p.deadline_type === "Recurso");
    expect(recurso?.end_date).toBe("2030-02-01");
  });
});

describe("regla: nunca se calcula desde la fecha de emisión", () => {
  it("sin notification_date ni reception_date, el plazo queda pendiente de determinar", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      issue_date: "2030-01-01", // no debe usarse como base
    });
    for (const p of plazos) {
      if (p.deadline_type === "Recurso") continue; // el recurso puede usar resolution_notified_date, ausente aquí también
      expect(p.status).toBe("Plazo pendiente de determinar");
      expect(p.end_date).toBeNull();
    }
  });

  it("usa reception_date si falta notification_date", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      reception_date: "2030-01-01",
    });
    const pago = plazos.find((p) => p.deadline_type === "Pago con reducción");
    expect(pago?.end_date).toBe("2030-01-21");
  });
});

describe("contraste entre fecha del documento y cálculo interno", () => {
  it("confirma cuando la diferencia es de 1 día o menos", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2030-01-01",
      payment_deadline: "2030-01-20", // cálculo interno: 2030-01-21, diff = 1
    });
    const pago = plazos.find((p) => p.deadline_type === "Pago con reducción");
    expect(pago?.status).toBe("Confirmado");
    expect(pago?.source).toBe("documento+calculo");
    expect(pago?.end_date).toBe("2030-01-20"); // el documento manda
  });

  it("marca pendiente de verificación cuando la diferencia es mayor y explica los días", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2030-01-01",
      payment_deadline: "2030-02-01", // muy distinto del cálculo interno (2030-01-21)
    });
    const pago = plazos.find((p) => p.deadline_type === "Pago con reducción");
    expect(pago?.status).toBe("Pendiente de verificación");
    expect(pago?.notes).toContain("Discrepancia de");
  });

  it("usa solo la fecha del documento si no hay fecha base para calcular", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      payment_deadline: "2030-01-20", // sin notification_date ni reception_date
    });
    const pago = plazos.find((p) => p.deadline_type === "Pago con reducción");
    expect(pago?.source).toBe("documento");
    expect(pago?.status).toBe("Confirmado");
    expect(pago?.end_date).toBe("2030-01-20");
  });
});

describe("vencimiento", () => {
  it("marca como vencido un plazo calculado que ya pasó", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "DGT",
      notification_date: "2000-01-01", // muy en el pasado, sea cual sea la fecha real de hoy
    });
    const pago = plazos.find((p) => p.deadline_type === "Pago con reducción");
    expect(pago?.status).toBe("Vencido");
  });

  it("no sobrescribe 'Pendiente de verificación' aunque la fecha ya haya pasado", () => {
    const plazos = calcularPlazos({
      sanctioning_authority: "Ministerio de Transportes", // regla no fiable
      notification_date: "2000-01-01",
    });
    const alegaciones = plazos.find((p) => p.deadline_type === "Alegaciones");
    expect(alegaciones?.status).toBe("Pendiente de verificación");
  });
});

describe("días hábiles", () => {
  it("salta fines de semana y festivos nacionales fijos al sumar días hábiles", () => {
    // 2026-01-01 es festivo (Año Nuevo); el conteo hábil debe saltarlo.
    const plazos = calcularPlazos({
      sanctioning_authority: "Ministerio de Transportes",
      notification_date: "2025-12-30", // martes
    });
    const alegaciones = plazos.find((p) => p.deadline_type === "Alegaciones");
    // 15 días hábiles desde el 30/12/2025, saltando 1 y 6 de enero (festivos) y fines de semana.
    expect(alegaciones?.end_date).toBe("2026-01-22");
  });
});
