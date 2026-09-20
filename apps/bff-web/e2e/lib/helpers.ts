/**
 * Helpers de E2E para Sanciona Fleet.
 *
 * Usa la REST de Supabase (PostgREST) con la service_role (desde env, inyectada
 * por scripts/run-e2e.sh desde SSM) para crear/limpiar datos de prueba de forma
 * fiable, sin depender del azar de la IA. El contenedor runtime de la app NO
 * usa service_role para这些; aquí la usamos solo como fixture del test.
 *
 * Constantes de la cuenta de prueba (org "cristian"):
 */
export const ORG_ID = "4dfd1713-4bb3-4a6a-9579-eb9ba6316dca";
export const USER_ID = "cc8161f2-9907-41b6-bb8f-6220d6130c3e";
export const AUTH_FILE = "e2e/.auth/user.json";

const SUPA_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY!;

/** Fila genérica de PostgREST (siempre con id). */
type Fila = { id: string; [key: string]: unknown };

/** ID único por run para los datos de prueba (evita colisiones). */
export function uid(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${ts}-${rnd}`;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPA_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`adminFetch ${path} -> ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function crearVehiculo(matricula: string): Promise<string> {
  const rows = await adminFetch<Fila[]>("/rest/v1/vehicles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      organization_id: ORG_ID,
      registration_number: matricula,
      brand: "Test",
      model: "Paridad",
      vehicle_type: "Furgoneta",
      status: "Activo",
    }),
  });
  return rows[0].id;
}

export async function crearConductor(nombre: string, dni: string): Promise<string> {
  const rows = await adminFetch<Fila[]>("/rest/v1/drivers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      organization_id: ORG_ID,
      full_name: nombre,
      identification_number: dni,
      status: "Activo",
    }),
  });
  return rows[0].id;
}

export interface SanctionSeed {
  reference: string;
  organismo?: string;
  categoria?: string;
  notificationDate?: string; // YYYY-MM-DD
  violationDate?: string;
  importe?: number;
  vehicleId?: string;
}

export async function crearSancion(seed: SanctionSeed): Promise<string> {
  const rows = await adminFetch<Fila[]>("/rest/v1/sanctions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      organization_id: ORG_ID,
      reference_number: seed.reference,
      sanctioning_authority: seed.organismo ?? "DGT",
      sanction_category: seed.categoria ?? "Tráfico",
      original_amount: seed.importe ?? 100,
      notification_date: seed.notificationDate ?? null,
      violation_date: seed.violationDate ?? null,
      vehicle_id: seed.vehicleId ?? null,
      status: "Nueva",
      priority: "Media",
      created_by: USER_ID,
    }),
  });
  return rows[0].id;
}

export async function borrarSancion(id: string): Promise<void> {
  // ON DELETE CASCADE limpia documents/actions/deadlines/analyses/drafts/comments
  await adminFetch(`/rest/v1/sanctions?id=eq.${id}`, { method: "DELETE" });
}

export async function borrarVehiculo(id: string): Promise<void> {
  await adminFetch(`/rest/v1/vehicles?id=eq.${id}`, { method: "DELETE" });
}

export async function borrarConductor(id: string): Promise<void> {
  await adminFetch(`/rest/v1/drivers?id=eq.${id}`, { method: "DELETE" });
}

/** Busca el id de una fila por un campo único (service_role). */
export async function buscarId(
  tabla: string,
  campo: string,
  valor: string,
): Promise<string | null> {
  const rows = await adminFetch<Fila[]>(
    `/rest/v1/${tabla}?${campo}=eq.${encodeURIComponent(valor)}&select=id`,
  );
  return rows[0]?.id ?? null;
}

/** Borra filas por campo (service_role). Para cleanup de datos de prueba. */
export async function borrarPor(tabla: string, campo: string, valor: string): Promise<void> {
  await adminFetch(`/rest/v1/${tabla}?${campo}=eq.${encodeURIComponent(valor)}`, {
    method: "DELETE",
  });
}

/** Lee el access_token del storageState (localStorage de Supabase) para llamadas RLS-scoped. */
export async function bearerDeStorage(): Promise<string> {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(AUTH_FILE, "utf8");
  const state = JSON.parse(raw);
  for (const origin of state.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      try {
        const v = JSON.parse(item.value);
        if (v && typeof v.access_token === "string") return v.access_token;
      } catch {
        /* no era JSON */
      }
    }
  }
  throw new Error("no se encontró access_token en el storageState");
}

/** Query PostgREST con el bearer del usuario (RLS-scoped). Devuelve las filas. */
export async function queryComoUsuario<T = unknown>(bearer: string, path: string): Promise<T> {
  const res = await fetch(`${SUPA_URL}${path}`, {
    headers: {
      apikey: PUBLISHABLE,
      Authorization: `Bearer ${bearer}`,
    },
  });
  if (!res.ok) throw new Error(`queryComoUsuario ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Espera a que la cola de TanStack Query asiente tras una navegación. */
export async function esperarCarga(page: import("@playwright/test").Page): Promise<void> {
  // Las rutas SSR=false cargan datos client-side; damos margen.
  await page.waitForLoadState("networkidle").catch(() => {});
}
