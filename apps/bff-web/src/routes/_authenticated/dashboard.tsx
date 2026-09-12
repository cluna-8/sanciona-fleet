import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileWarning,
  ClipboardCheck,
  AlarmClock,
  Euro,
  PiggyBank,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EtiquetaEstado, EtiquetaPrioridad, EtiquetaPlazo } from "@/components/etiquetas";
import { useSesion } from "@/hooks/use-org";
import { useSanciones, type Sancion } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ESTADOS_ABIERTOS, formatoImporte, diasRestantes } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function plazoRelevante(s: Sancion) {
  const candidatos = [s.payment_deadline, s.appeal_deadline].filter(Boolean) as string[];
  if (!candidatos.length) return null;
  return candidatos.sort()[0]!;
}

function Dashboard() {
  const { data: sesion } = useSesion();
  const { data: sanciones, isLoading } = useSanciones(sesion?.organization?.id);

  const lista = sanciones ?? [];
  const abiertas = lista.filter((s) => ESTADOS_ABIERTOS.includes(s.status as never));
  const pendientesRevision = lista.filter((s) => s.status === "Pendiente de revisión");
  const proximos = abiertas.filter((s) => {
    const d = diasRestantes(plazoRelevante(s));
    return d !== null && d <= 7;
  });
  const importeAbierto = abiertas.reduce((acc, s) => acc + Number(s.original_amount ?? 0), 0);
  const ahorro = abiertas.reduce(
    (acc, s) =>
      acc +
      Math.max(
        0,
        Number(s.original_amount ?? 0) - Number(s.discounted_amount ?? s.original_amount ?? 0),
      ),
    0,
  );

  const porEstado = agrupar(lista, (s) => s.status);
  const porCategoria = agrupar(lista, (s) => s.sanction_category ?? "Sin categoría");
  const ultimas = [...lista].slice(0, 6);

  const tarjetas = [
    {
      titulo: "Sanciones abiertas",
      valor: String(abiertas.length),
      icono: FileWarning,
      detalle: `${lista.length} expedientes en total`,
      acento: "text-navy",
    },
    {
      titulo: "Pendientes de revisión",
      valor: String(pendientesRevision.length),
      icono: ClipboardCheck,
      detalle: "Requieren validación jurídica",
      acento: "text-navy",
    },
    {
      titulo: "Plazos en 7 días",
      valor: String(proximos.length),
      icono: AlarmClock,
      detalle: "Pago o recurso próximos a vencer",
      acento: "text-accent",
    },
    {
      titulo: "Importe abierto",
      valor: formatoImporte(importeAbierto),
      icono: Euro,
      detalle: "Suma de sanciones sin resolver",
      acento: "text-navy",
    },
    {
      titulo: "Ahorro por pronto pago",
      valor: formatoImporte(ahorro),
      icono: PiggyBank,
      detalle: "Potencial con reducción aplicable",
      acento: "text-success",
    },
  ];

  return (
    <AppShell
      titulo="Panel de control"
      descripcion="Situación global de los expedientes sancionadores"
      acciones={
        <Button asChild>
          <Link to="/sanciones/nueva">
            <Plus className="mr-2 h-4 w-4" /> Nueva sanción
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {tarjetas.map((t) => (
            <div key={t.titulo} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.titulo}
                </p>
                <t.icono className={`h-4 w-4 ${t.acento}`} />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">{t.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.detalle}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BloqueDistribucion titulo="Sanciones por estado" datos={porEstado} total={lista.length} />
        <BloqueDistribucion
          titulo="Sanciones por categoría"
          datos={porCategoria}
          total={lista.length}
        />
      </div>

      <div className="card-surface mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Últimos expedientes registrados</h2>
          <Link
            to="/sanciones"
            className="inline-flex items-center text-sm font-medium text-navy hover:underline"
          >
            Ver todos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
        {ultimas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Todavía no hay sanciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Expediente</th>
                  <th className="px-5 py-3 font-medium">Matrícula</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Importe</th>
                  <th className="px-5 py-3 font-medium">Plazo</th>
                  <th className="px-5 py-3 font-medium">Prioridad</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <Link
                        to="/sanciones/$id"
                        params={{ id: s.id }}
                        className="font-medium text-navy hover:underline"
                      >
                        {s.reference_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{s.vehicles?.registration_number ?? "—"}</td>
                    <td className="px-5 py-3">{s.sanction_category ?? "—"}</td>
                    <td className="px-5 py-3">{formatoImporte(s.original_amount)}</td>
                    <td className="px-5 py-3">
                      <EtiquetaPlazo fecha={plazoRelevante(s)} estado={s.status} />
                    </td>
                    <td className="px-5 py-3">
                      <EtiquetaPrioridad prioridad={s.priority} />
                    </td>
                    <td className="px-5 py-3">
                      <EtiquetaEstado estado={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function agrupar(lista: Sancion[], clave: (s: Sancion) => string) {
  const mapa = new Map<string, number>();
  for (const s of lista) mapa.set(clave(s), (mapa.get(clave(s)) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function BloqueDistribucion({
  titulo,
  datos,
  total,
}: {
  titulo: string;
  datos: [string, number][];
  total: number;
}) {
  return (
    <div className="card-surface p-5">
      <h2 className="text-base font-semibold">{titulo}</h2>
      {datos.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sin datos disponibles.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {datos.map(([etiqueta, valor]) => (
            <li key={etiqueta}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-3 text-foreground">{etiqueta}</span>
                <span className="font-semibold tabular-nums text-muted-foreground">{valor}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-soft">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${total ? (valor / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
