/**
 * Lógica HTTP pura, sin depender de `cloudflare:workers` (ese módulo solo
 * existe dentro de workerd). La separación permite reutilizarla tanto desde
 * el Worker real (index.ts) como desde el shim de desarrollo local sobre
 * Bun (local-dev-server.ts) — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §4.
 */
import type { PeticionCalculoPlazos, RespuestaCalculoPlazos } from "@sanciona/contracts";
import { calcularPlazos } from "./plazos";

export function calcular(peticion: PeticionCalculoPlazos): RespuestaCalculoPlazos {
  return {
    sanction_id: peticion.sanction_id,
    plazos: calcularPlazos(peticion.entrada),
    calculado_en: new Date().toISOString(),
  };
}

export async function manejarFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return Response.json({ service: "deadlines-service", status: "ok" });
  }

  if (url.pathname === "/calcular" && request.method === "POST") {
    let body: PeticionCalculoPlazos;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }
    if (!body?.sanction_id || !body?.entrada) {
      return Response.json(
        { error: "Faltan campos obligatorios: sanction_id, entrada" },
        { status: 400 },
      );
    }
    return Response.json(calcular(body));
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
