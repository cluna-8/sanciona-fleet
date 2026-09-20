/**
 * Cuota diaria de IA (A-3b): la medianoche con cambio de hora, el límite plano
 * con el mapa por plan inactivo, el fail-open del conteo y el corte de cuota.
 *
 * `comprobarCuotaDiariaIA` se ejercita contra un cliente supabase falso: la
 * política no debe tocar la red.
 */
import { describe, expect, it } from "bun:test";
import {
  LIMITE_DIARIO_POR_DEFECTO,
  comprobarCuotaDiariaIA,
  inicioDiaEnZona,
  limiteDiarioIA,
} from "./limites-ia.server";

describe("inicioDiaEnZona (Europe/Madrid, DST incluido)", () => {
  it("verano (CEST, UTC+2): el día local empieza a las 22:00Z del anterior", () => {
    const inicio = inicioDiaEnZona(new Date("2026-07-15T10:00:00Z"), "Europe/Madrid");
    expect(inicio.toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("invierno (CET, UTC+1): el día local empieza a las 23:00Z del anterior", () => {
    const inicio = inicioDiaEnZona(new Date("2026-01-15T23:30:00Z"), "Europe/Madrid");
    expect(inicio.toISOString()).toBe("2026-01-15T23:00:00.000Z");
  });

  it("el día del paso a horario de verano (2026-03-29) empieza aún en hora de invierno", () => {
    // La transición es a las 02:00 local (01:00Z): la medianoche fue CET (+1).
    const inicio = inicioDiaEnZona(new Date("2026-03-29T05:00:00Z"), "Europe/Madrid");
    expect(inicio.toISOString()).toBe("2026-03-28T23:00:00.000Z");
  });

  it("el día del paso a horario de invierno (2026-10-25) empieza aún en hora de verano", () => {
    // La transición es a las 03:00 local (01:00Z): la medianoche fue CEST (+2).
    const inicio = inicioDiaEnZona(new Date("2026-10-25T05:00:00Z"), "Europe/Madrid");
    expect(inicio.toISOString()).toBe("2026-10-24T22:00:00.000Z");
  });

  it("en UTC la medianoche local y la UTC coinciden", () => {
    const inicio = inicioDiaEnZona(new Date("2026-09-20T01:00:00Z"), "UTC");
    expect(inicio.toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });
});

describe("limiteDiarioIA con el mapa por plan inactivo", () => {
  it("todos los planes usan el límite plano por defecto", () => {
    expect(limiteDiarioIA("basico")).toBe(LIMITE_DIARIO_POR_DEFECTO);
    expect(limiteDiarioIA("pro")).toBe(LIMITE_DIARIO_POR_DEFECTO);
    expect(limiteDiarioIA("empresa")).toBe(LIMITE_DIARIO_POR_DEFECTO);
    expect(limiteDiarioIA(null)).toBe(LIMITE_DIARIO_POR_DEFECTO);
    expect(limiteDiarioIA(undefined)).toBe(LIMITE_DIARIO_POR_DEFECTO);
  });
});

/** Cliente supabase falso: la cadena de la query devuelta ya está resuelta. */
function clienteConUso(salida: { count?: number | null; error?: { message: string } | null }) {
  const fin = Promise.resolve({ count: salida.count ?? null, error: salida.error ?? null });
  return {
    from: () => ({ select: () => ({ eq: () => ({ gte: () => fin }) }) }),
  } as never;
}

describe("comprobarCuotaDiariaIA", () => {
  it("por debajo del límite no lanza", async () => {
    await comprobarCuotaDiariaIA(clienteConUso({ count: 0 }), "org-1");
    await comprobarCuotaDiariaIA(clienteConUso({ count: LIMITE_DIARIO_POR_DEFECTO - 1 }), "org-1");
  });

  it("alcanzado el límite corta con el mensaje amigable", async () => {
    try {
      await comprobarCuotaDiariaIA(clienteConUso({ count: LIMITE_DIARIO_POR_DEFECTO }), "org-1");
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as Error).message).toBe(
        `Se ha alcanzado el límite diario de operaciones con IA (${LIMITE_DIARIO_POR_DEFECTO} al día). Se restablece mañana.`,
      );
    }
  });

  it("falla abierto si el conteo falla (p. ej. tabla aún sin migrar)", async () => {
    await comprobarCuotaDiariaIA(
      clienteConUso({ error: { message: "relation ai_usage_logs does not exist" } }),
      "org-1",
    );
  });
});
