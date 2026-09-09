/**
 * deadlines-service — Worker de Cloudflare.
 *
 * Expone el motor de plazos determinista de dos formas:
 * 1. RPC (`DeadlinesService.calcular`) para otros Workers que lo invoquen por
 *    service binding (patrón preferido en producción, sin salir a la red
 *    pública — ver SPEC.md §7.2).
 * 2. HTTP (`POST /calcular`) para pruebas locales, `curl`, y cualquier
 *    consumidor que aún no tenga un binding directo.
 *
 * Sin base de datos ni llamadas externas: es lógica pura, por diseño, para que
 * su comportamiento sea 100 % determinista y testeable.
 */
import { WorkerEntrypoint } from "cloudflare:workers";
import type { PeticionCalculoPlazos, RespuestaCalculoPlazos } from "@sanciona/contracts";
import { calcularPlazos } from "./plazos";

function calcular(peticion: PeticionCalculoPlazos): RespuestaCalculoPlazos {
  return {
    sanction_id: peticion.sanction_id,
    plazos: calcularPlazos(peticion.entrada),
    calculado_en: new Date().toISOString(),
  };
}

export default class DeadlinesService extends WorkerEntrypoint {
  /** Punto de entrada RPC: `env.DEADLINES.calcular(peticion)` desde otro Worker. */
  calcular(peticion: PeticionCalculoPlazos): RespuestaCalculoPlazos {
    return calcular(peticion);
  }

  async fetch(request: Request): Promise<Response> {
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
}
