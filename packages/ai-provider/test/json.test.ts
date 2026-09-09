import { describe, expect, it } from "bun:test";
import { ErrorIA, codigoDesdeStatus } from "../src/errores";
import { extraerJson } from "../src/json";

describe("extraerJson", () => {
  it("parsea JSON limpio", () => {
    expect(extraerJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("quita las vallas ```json que los modelos añaden por su cuenta", () => {
    expect(extraerJson<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(extraerJson<{ a: number }>("```\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("rescata el objeto cuando el modelo lo rodea de explicaciones", () => {
    const salida = 'Claro, aquí tienes:\n{"semaforo":"Gris"}\nEspero que te sirva.';
    expect(extraerJson<{ semaforo: string }>(salida)).toEqual({ semaforo: "Gris" });
  });

  it("lanza respuesta_ilegible si no hay JSON recuperable", () => {
    expect(() => extraerJson("no puedo procesar este documento")).toThrow(ErrorIA);
    try {
      extraerJson("nada de JSON");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("respuesta_ilegible");
    }
  });
});

describe("traducción de errores HTTP", () => {
  it("mapea cada status al código del dominio", () => {
    expect(codigoDesdeStatus(401)).toBe("no_autorizado");
    expect(codigoDesdeStatus(402)).toBe("sin_credito");
    expect(codigoDesdeStatus(429)).toBe("limite_peticiones");
    expect(codigoDesdeStatus(400)).toBe("documento_invalido");
    expect(codigoDesdeStatus(500)).toBe("no_disponible");
  });

  it("marca como reintentables solo los fallos transitorios", () => {
    expect(new ErrorIA("limite_peticiones").reintentable).toBe(true);
    expect(new ErrorIA("no_disponible").reintentable).toBe(true);
    expect(new ErrorIA("no_autorizado").reintentable).toBe(false);
    expect(new ErrorIA("sin_credito").reintentable).toBe(false);
  });

  it("el mensaje al usuario no filtra el detalle técnico", () => {
    const e = new ErrorIA("no_autorizado", "Bearer sk-abc123 rechazado");
    expect(e.message).not.toContain("sk-abc123");
    expect(e.detalle).toContain("sk-abc123");
  });
});
