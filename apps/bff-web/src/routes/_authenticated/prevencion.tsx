import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSesion } from "@/hooks/use-org";
import { useSanciones } from "@/features/expedientes";
import { formatoImporte } from "@/lib/fleet";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/prevencion")({
  component: Prevencion,
  head: () => ({
    meta: [
      { title: "Prevención de sanciones · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Detecta patrones de infracciones por vehículo, conductor, zona y tipología para reducir el coste sancionador de la flota.",
      },
      { property: "og:title", content: "Prevención de sanciones · Sanciona Fleet" },
      {
        property: "og:description",
        content:
          "Análisis de patrones de sanciones de la flota basado en datos reales de tu empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function agrupar<T>(items: T[], clave: (i: T) => string | null) {
  const mapa = new Map<string, number>();
  for (const i of items) {
    const k = clave(i);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function Prevencion() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: sanciones, isLoading } = useSanciones(orgId);

  if (isLoading) {
    return (
      <AppShell titulo="Prevención">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const lista = sanciones ?? [];
  const total = lista.length;

  const trimestre = lista.filter((s) => {
    const d = new Date(s.created_at);
    return Date.now() - d.getTime() <= 92 * 86400000;
  });

  const categorias = agrupar(lista, (s) => s.sanction_category);
  const vehiculos = agrupar(lista, (s) => s.vehicles?.registration_number ?? null);
  const conductores = agrupar(lista, (s) => s.drivers?.full_name ?? null);
  const zonas = agrupar(lista, (s) => (s as { municipality?: string | null }).municipality ?? null);

  const meses = new Map<string, { n: number; importe: number }>();
  for (const s of lista) {
    const clave = (s.violation_date ?? s.created_at).slice(0, 7);
    const actual = meses.get(clave) ?? { n: 0, importe: 0 };
    actual.n += 1;
    actual.importe += Number(s.original_amount ?? 0);
    meses.set(clave, actual);
  }
  const tendencia = [...meses.entries()].sort().slice(-6);

  const recomendaciones: string[] = [];
  const catsTrimestre = agrupar(trimestre, (s) => s.sanction_category);
  const principal = catsTrimestre[0];
  if (principal && trimestre.length > 0) {
    const pct = Math.round((principal[1] / trimestre.length) * 100);
    recomendaciones.push(
      `Las sanciones por ${principal[0].toLowerCase()} representan el ${pct} % de los expedientes del último trimestre. Revisar planificación y controles internos.`,
    );
  }
  const vehiculoTop = vehiculos[0];
  if (vehiculoTop && vehiculoTop[1] >= 2) {
    recomendaciones.push(
      `El vehículo ${vehiculoTop[0]} acumula ${vehiculoTop[1]} expedientes. Revisar rutas asignadas y estado documental del vehículo.`,
    );
  }
  const conductorTop = conductores[0];
  if (conductorTop && conductorTop[1] >= 2) {
    recomendaciones.push(
      `${conductorTop[0]} acumula ${conductorTop[1]} expedientes. Valorar formación específica y revisión de la planificación de jornada.`,
    );
  }
  const sinIdentificar = lista.filter((s) => !s.driver_id).length;
  if (sinIdentificar > 0) {
    recomendaciones.push(
      `${sinIdentificar} expedientes no tienen conductor asignado. Implantar un registro interno de conductor por vehículo y turno.`,
    );
  }

  return (
    <AppShell
      titulo="Prevención"
      descripcion="Patrones detectados en los expedientes de tu empresa"
    >
      {total === 0 ? (
        <p className="card-surface p-8 text-center text-sm text-muted-foreground">
          Todavía no hay expedientes suficientes para detectar patrones.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-surface p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Recomendaciones internas</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Basadas exclusivamente en los datos registrados por tu empresa.
            </p>
            <ul className="mt-3 space-y-2">
              {recomendaciones.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  No se han detectado patrones relevantes en el periodo analizado.
                </li>
              )}
              {recomendaciones.map((r) => (
                <li key={r} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <Tabla titulo="Infracciones más frecuentes" filas={categorias} etiqueta="Categoría" />
          <Tabla titulo="Vehículos con mayor incidencia" filas={vehiculos} etiqueta="Matrícula" />
          <Tabla
            titulo="Conductores con mayor incidencia"
            filas={conductores}
            etiqueta="Conductor"
          />
          <Tabla titulo="Zonas con más sanciones" filas={zonas} etiqueta="Municipio" />

          <div className="card-surface overflow-hidden lg:col-span-2">
            <h2 className="border-b border-border px-5 py-4 text-base font-semibold">
              Tendencia mensual
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Mes</th>
                  <th className="px-5 py-2 text-right font-medium">Expedientes</th>
                  <th className="px-5 py-2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tendencia.map(([mes, v]) => (
                  <tr key={mes}>
                    <td className="px-5 py-2">{mes}</td>
                    <td className="px-5 py-2 text-right">{v.n}</td>
                    <td className="px-5 py-2 text-right">{formatoImporte(v.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Tabla({
  titulo,
  filas,
  etiqueta,
}: {
  titulo: string;
  filas: [string, number][];
  etiqueta: string;
}) {
  return (
    <div className="card-surface overflow-hidden">
      <h2 className="border-b border-border px-5 py-4 text-base font-semibold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-medium">{etiqueta}</th>
              <th className="px-5 py-2 text-right font-medium">Expedientes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.slice(0, 8).map(([k, n]) => (
              <tr key={k}>
                <td className="px-5 py-2">{k}</td>
                <td className="px-5 py-2 text-right">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
