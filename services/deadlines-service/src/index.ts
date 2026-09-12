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
 * su comportamiento sea 100 % determinista y testeable. La lógica HTTP en sí
 * vive en http.ts, sin depender de `cloudflare:workers`, para poder
 * reutilizarla también fuera de workerd (ver local-dev-server.ts).
 */
import { WorkerEntrypoint } from "cloudflare:workers";
import type { PeticionCalculoPlazos, RespuestaCalculoPlazos } from "@sanciona/contracts";
import { calcular, manejarFetch } from "./http";

export default class DeadlinesService extends WorkerEntrypoint {
  /** Punto de entrada RPC: `env.DEADLINES.calcular(peticion)` desde otro Worker. */
  calcular(peticion: PeticionCalculoPlazos): RespuestaCalculoPlazos {
    return calcular(peticion);
  }

  fetch(request: Request): Promise<Response> {
    return manejarFetch(request);
  }
}
