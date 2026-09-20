import { test, expect } from "@playwright/test";
import { bearerDeStorage, queryComoUsuario, ORG_ID } from "./lib/helpers";

/**
 * CU-06 — Aislamiento entre empresas (tenant isolation).
 *
 * A nivel de datos: con el bearer de Cristian (org "cristian"), PostgREST + RLS
 * debe devolver SOLO sanciones de su org, y NINGUNA de la org demo
 * (11111111-…) ni de ninguna otra. Es la garantía de separación (RS-2).
 */
const DEMO_ORG = "11111111-1111-4111-8111-111111111111";

test("CU-06: RLS sólo devuelve sanciones de la org del usuario", async () => {
  const bearer = await bearerDeStorage();
  type FilaOrg = { id: string; organization_id: string };

  const filas = await queryComoUsuario<FilaOrg[]>(
    bearer,
    "/rest/v1/sanctions?select=id,organization_id",
  );
  expect(Array.isArray(filas)).toBeTruthy();
  // Ninguna fila pertenece a otra org
  for (const f of filas) {
    expect(f.organization_id).toBe(ORG_ID);
  }

  // Acceso directo a la org demo -> RLS bloquea, lista vacía
  const demo = await queryComoUsuario<{ id: string }[]>(
    bearer,
    `/rest/v1/sanctions?organization_id=eq.${DEMO_ORG}&select=id`,
  );
  expect(demo).toHaveLength(0);

  // Lo mismo con vehículos
  const veh = await queryComoUsuario<FilaOrg[]>(
    bearer,
    "/rest/v1/vehicles?select=id,organization_id",
  );
  for (const v of veh) {
    expect(v.organization_id).toBe(ORG_ID);
  }
});
