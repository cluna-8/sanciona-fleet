import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { useSesion } from "@/hooks/use-org";
import { useSanciones, type Sancion } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ESTADOS_ABIERTOS } from "@sanciona/contracts";
import { formatoImporte } from "@/shared/lib/formato";

export const Route = createFileRoute("/_authenticated/informes")({
  component: Informes,
  head: () => ({
    meta: [
      { title: "Informes | Sanciona Fleet" },
      {
        name: "description",
        content:
          "Informes agregados de sanciones por estado, categoría, organismo y evolución mensual del importe.",
      },
      { property: "og:title", content: "Informes | Sanciona Fleet" },
      {
        property: "og:description",
        content: "Agregados de expedientes sancionadores por estado, categoría y organismo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Fila = { clave: string; expedientes: number; importe: number };

function agrupar(sanciones: Sancion[], campo: (s: Sancion) => string | null | undefined): Fila[] {
  const mapa = new Map<string, Fila>();
  for (const s of sanciones) {
    const clave = campo(s) || "Sin indicar";
    const fila = mapa.get(clave) ?? { clave, expedientes: 0, importe: 0 };
    fila.expedientes += 1;
    fila.importe += Number(s.original_amount ?? 0);
    mapa.set(clave, fila);
  }
  return [...mapa.values()].sort((a, b) => b.importe - a.importe);
}

function descargarCsv(nombre: string, filas: Fila[]) {
  const cabecera = "Concepto;Expedientes;Importe";
  const cuerpo = filas
    .map((f) => `"${f.clave.replace(/"/g, '""')}";${f.expedientes};${f.importe.toFixed(2)}`)
    .join("\n");
  const blob = new Blob(["\ufeff" + cabecera + "\n" + cuerpo], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Informes() {
  const { data: sesion } = useSesion();
  const { data: sanciones, isLoading } = useSanciones(sesion?.organization?.id);

  const bloques = useMemo(() => {
    const lista = sanciones ?? [];
    return [
      {
        titulo: "Por estado",
        nombre: "sanciones-por-estado",
        filas: agrupar(lista, (s) => s.status),
      },
      {
        titulo: "Por categoría",
        nombre: "sanciones-por-categoria",
        filas: agrupar(lista, (s) => s.sanction_category),
      },
      {
        titulo: "Por organismo sancionador",
        nombre: "sanciones-por-organismo",
        filas: agrupar(lista, (s) => s.sanctioning_authority),
      },
      {
        titulo: "Por vehículo",
        nombre: "sanciones-por-vehiculo",
        filas: agrupar(lista, (s) => s.vehicles?.registration_number),
      },
      {
        titulo: "Por mes de notificación",
        nombre: "sanciones-por-mes",
        filas: agrupar(lista, (s) => (s.notification_date ?? s.created_at).slice(0, 7)).sort(
          (a, b) => a.clave.localeCompare(b.clave),
        ),
      },
    ];
  }, [sanciones]);

  const lista = sanciones ?? [];
  const abiertos = lista.filter((s) => ESTADOS_ABIERTOS.includes(s.status as never));
  const importeAbierto = abiertos.reduce((t, s) => t + Number(s.original_amount ?? 0), 0);
  const pagado = lista
    .filter((s) => s.status === "Pagada")
    .reduce((t, s) => t + Number(s.discounted_amount ?? s.original_amount ?? 0), 0);
  const ahorro = abiertos.reduce(
    (t, s) =>
      t +
      Math.max(
        0,
        Number(s.original_amount ?? 0) - Number(s.discounted_amount ?? s.original_amount ?? 0),
      ),
    0,
  );

  return (
    <AppShell titulo="Informes" descripcion="Agregados de expedientes e importes de la empresa">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="card-surface grid divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Indicador etiqueta="Expedientes registrados" valor={String(lista.length)} />
            <Indicador etiqueta="Expedientes abiertos" valor={String(abiertos.length)} />
            <Indicador etiqueta="Importe abierto" valor={formatoImporte(importeAbierto)} />
            <Indicador etiqueta="Importe pagado" valor={formatoImporte(pagado)} />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Ahorro potencial estimado por pronto pago sobre expedientes abiertos:{" "}
            <span className="font-medium text-foreground">{formatoImporte(ahorro)}</span>
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {bloques.map((b) => (
              <div key={b.nombre} className="card-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h2 className="text-[15px] font-medium text-foreground">{b.titulo}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!b.filas.length}
                    onClick={() => descargarCsv(b.nombre, b.filas)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
                {b.filas.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                    Sin datos disponibles.
                  </p>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Concepto</th>
                        <th className="px-4 py-2 font-medium text-right">Expedientes</th>
                        <th className="px-4 py-2 font-medium text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.filas.map((f) => (
                        <tr key={f.clave} className="border-t border-border">
                          <td className="px-4 py-2">{f.clave}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{f.expedientes}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatoImporte(f.importe)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">{valor}</p>
    </div>
  );
}
