import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Users, FileWarning, Euro, Truck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { obtenerVisionGlobal } from "@/lib/superadmin.functions";
import { formatoImporte } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/superadmin")({
  head: () => ({
    meta: [
      { title: "Superadministración | Sanciona Fleet" },
      {
        name: "description",
        content:
          "Visión global de la actividad de todas las empresas dadas de alta en Sanciona Fleet.",
      },
      { property: "og:title", content: "Superadministración | Sanciona Fleet" },
      {
        property: "og:description",
        content: "Seguimiento global de empresas, sanciones y actividad en la plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaSuperadmin,
});

function fechaCorta(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function PaginaSuperadmin() {
  const fn = useServerFn(obtenerVisionGlobal);
  const { data, isLoading, error } = useQuery({
    queryKey: ["vision-global"],
    queryFn: () => fn({ data: undefined }),
  });

  const t = data?.totales;
  const tarjetas = [
    { titulo: "Empresas", valor: String(t?.empresas ?? 0), icono: Building2 },
    { titulo: "Usuarios activos", valor: String(t?.usuarios ?? 0), icono: Users },
    { titulo: "Sanciones", valor: String(t?.sanciones ?? 0), icono: FileWarning },
    { titulo: "Sanciones abiertas", valor: String(t?.sancionesAbiertas ?? 0), icono: ShieldCheck },
    { titulo: "Flota registrada", valor: String(t?.vehiculos ?? 0), icono: Truck },
    { titulo: "Importe acumulado", valor: formatoImporte(t?.importeTotal ?? 0), icono: Euro },
  ];

  return (
    <AppShell
      titulo="Superadministración"
      descripcion="Visión global de la actividad de todas las empresas de la plataforma"
    >
      {error ? (
        <div className="card-surface p-6 text-sm text-destructive">{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {tarjetas.map((c) => (
              <div key={c.titulo} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {c.titulo}
                  </p>
                  <c.icono className="h-4 w-4 text-navy" />
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{c.valor}</p>
              </div>
            ))}
          </div>

          <div className="card-surface mt-6 overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Empresas dadas de alta</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Empresa</th>
                    <th className="px-5 py-3 font-medium">CIF</th>
                    <th className="px-5 py-3 font-medium">Provincia</th>
                    <th className="px-5 py-3 font-medium">Usuarios</th>
                    <th className="px-5 py-3 font-medium">Vehículos</th>
                    <th className="px-5 py-3 font-medium">Conductores</th>
                    <th className="px-5 py-3 font-medium">Sanciones</th>
                    <th className="px-5 py-3 font-medium">Abiertas</th>
                    <th className="px-5 py-3 font-medium">Importe</th>
                    <th className="px-5 py-3 font-medium">Alta</th>
                    <th className="px-5 py-3 font-medium">Últ. actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.empresas ?? []).map((e) => (
                    <tr key={e.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-5 py-3 font-medium text-foreground">{e.nombre}</td>
                      <td className="px-5 py-3">{e.cif ?? "—"}</td>
                      <td className="px-5 py-3">{e.provincia ?? "—"}</td>
                      <td className="px-5 py-3 tabular-nums">{e.usuarios}</td>
                      <td className="px-5 py-3 tabular-nums">{e.vehiculos}</td>
                      <td className="px-5 py-3 tabular-nums">{e.conductores}</td>
                      <td className="px-5 py-3 tabular-nums">{e.sanciones}</td>
                      <td className="px-5 py-3 tabular-nums">{e.sancionesAbiertas}</td>
                      <td className="px-5 py-3 tabular-nums">{formatoImporte(e.importeTotal)}</td>
                      <td className="px-5 py-3">{fechaCorta(e.creada)}</td>
                      <td className="px-5 py-3">{fechaCorta(e.ultimaActividad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-surface mt-6 overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Actividad reciente por empresa</h2>
            </div>
            {(data?.actividad ?? []).length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No hay actividad registrada todavía.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(data?.actividad ?? []).map((a) => (
                  <li key={a.id} className="flex flex-wrap gap-x-3 gap-y-1 px-5 py-3 text-sm">
                    <span className="font-medium text-foreground">{a.empresa}</span>
                    <span className="text-muted-foreground">{a.accion ?? "—"}</span>
                    {a.detalle && <span className="text-muted-foreground">· {a.detalle}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(a.fecha).toLocaleString("es-ES")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
