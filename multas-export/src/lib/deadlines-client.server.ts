/**
 * Cliente de deadlines-service (microservicio extraído — SPEC.md §7.5).
 *
 * bff-web (esta app) ya no calcula los plazos localmente: se lo pide al
 * servicio dedicado, que corre de forma independiente (en local, con
 * `bun run dev` dentro de services/deadlines-service; en producción, por un
 * service binding de Cloudflare Workers).
 *
 * Server-only: no importar desde un componente de cliente.
 */
import type { EntradaPlazos, PlazoCalculado } from "./plazos";

const DEADLINES_SERVICE_URL = process.env["DEADLINES_SERVICE_URL"] ?? "http://localhost:8787";

export async function calcularPlazosRemoto(
  sanctionId: string,
  entrada: EntradaPlazos,
): Promise<PlazoCalculado[]> {
  const respuesta = await fetch(`${DEADLINES_SERVICE_URL}/calcular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sanction_id: sanctionId, entrada }),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => "");
    throw new Error(
      `deadlines-service respondió ${respuesta.status} al calcular los plazos del expediente ${sanctionId}. ` +
        `¿Está corriendo en ${DEADLINES_SERVICE_URL}? (${texto || "sin detalle"})`,
    );
  }

  const datos = (await respuesta.json()) as { plazos: PlazoCalculado[] };
  return datos.plazos;
}
