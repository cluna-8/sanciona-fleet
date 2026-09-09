import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ResumenEmpresa = {
  id: string;
  nombre: string;
  cif: string | null;
  provincia: string | null;
  creada: string;
  usuarios: number;
  vehiculos: number;
  conductores: number;
  sanciones: number;
  sancionesAbiertas: number;
  importeTotal: number;
  ultimaActividad: string | null;
};

export type ActividadGlobal = {
  id: string;
  empresa: string;
  accion: string | null;
  detalle: string | null;
  entidad: string | null;
  fecha: string;
};

export type VisionGlobal = {
  totales: {
    empresas: number;
    usuarios: number;
    sanciones: number;
    sancionesAbiertas: number;
    vehiculos: number;
    conductores: number;
    importeTotal: number;
  };
  empresas: ResumenEmpresa[];
  actividad: ActividadGlobal[];
};

const ESTADOS_CERRADOS = new Set([
  "Resuelta favorablemente",
  "Resuelta desfavorablemente",
  "Pagada",
  "Archivada",
]);

// Empresa ficticia de demostración pública: nunca aparece en la visión global.
const DEMO_ORG_ID = "11111111-1111-4111-8111-111111111111";

export const obtenerVisionGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisionGlobal> => {
    const { data: esAdmin, error: errorRol } = await context.supabase.rpc("is_platform_admin");
    if (errorRol) throw new Error("No se ha podido verificar el permiso de superadministrador.");
    if (!esAdmin) throw new Error("Acceso restringido a superadministradores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [orgs, miembros, vehiculos, conductores, sanciones, logs] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, cif, province, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("organization_members").select("organization_id, user_id, status"),
      supabaseAdmin.from("vehicles").select("organization_id"),
      supabaseAdmin.from("drivers").select("organization_id"),
      supabaseAdmin
        .from("sanctions")
        .select("organization_id, status, original_amount, updated_at"),
      supabaseAdmin
        .from("activity_logs")
        .select("id, organization_id, action, details, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const listaOrgs = (orgs.data ?? []).filter((o) => o.id !== DEMO_ORG_ID);
    const nombrePorOrg = new Map(listaOrgs.map((o) => [o.id, o.name]));
    const cuenta = (rows: { organization_id: string }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) m.set(r.organization_id, (m.get(r.organization_id) ?? 0) + 1);
      return m;
    };

    const usuariosPorOrg = cuenta(
      (miembros.data ?? []).filter((m) => m.status === "activo") as { organization_id: string }[],
    );
    const vehiculosPorOrg = cuenta(vehiculos.data);
    const conductoresPorOrg = cuenta(conductores.data);

    const sancionesPorOrg = new Map<
      string,
      { total: number; abiertas: number; importe: number; ultima: string | null }
    >();
    for (const s of sanciones.data ?? []) {
      const prev =
        sancionesPorOrg.get(s.organization_id) ??
        { total: 0, abiertas: 0, importe: 0, ultima: null as string | null };
      prev.total += 1;
      if (!ESTADOS_CERRADOS.has(s.status)) prev.abiertas += 1;
      prev.importe += Number(s.original_amount ?? 0);
      if (!prev.ultima || (s.updated_at && s.updated_at > prev.ultima)) prev.ultima = s.updated_at;
      sancionesPorOrg.set(s.organization_id, prev);
    }

    const empresas: ResumenEmpresa[] = listaOrgs.map((o) => {
      const s = sancionesPorOrg.get(o.id);
      return {
        id: o.id,
        nombre: o.name,
        cif: o.cif,
        provincia: o.province,
        creada: o.created_at,
        usuarios: usuariosPorOrg.get(o.id) ?? 0,
        vehiculos: vehiculosPorOrg.get(o.id) ?? 0,
        conductores: conductoresPorOrg.get(o.id) ?? 0,
        sanciones: s?.total ?? 0,
        sancionesAbiertas: s?.abiertas ?? 0,
        importeTotal: s?.importe ?? 0,
        ultimaActividad: s?.ultima ?? null,
      };
    });

    const usuariosUnicos = new Set(
      (miembros.data ?? []).filter((m) => m.status === "activo").map((m) => m.user_id),
    );

    return {
      totales: {
        empresas: empresas.length,
        usuarios: usuariosUnicos.size,
        sanciones: empresas.reduce((a, e) => a + e.sanciones, 0),
        sancionesAbiertas: empresas.reduce((a, e) => a + e.sancionesAbiertas, 0),
        vehiculos: empresas.reduce((a, e) => a + e.vehiculos, 0),
        conductores: empresas.reduce((a, e) => a + e.conductores, 0),
        importeTotal: empresas.reduce((a, e) => a + e.importeTotal, 0),
      },
      empresas,
      actividad: (logs.data ?? [])
        .filter((l) => l.organization_id !== DEMO_ORG_ID)
        .map((l) => ({
        id: l.id,
        empresa: nombrePorOrg.get(l.organization_id) ?? "—",
        accion: l.action,
        detalle: l.details,
        entidad: l.entity_type,
        fecha: l.created_at,
      })),
    };
  });
