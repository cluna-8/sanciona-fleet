import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { EtiquetaEstado } from "@/shared/components/EtiquetaEstado";
import { useSesion } from "@/hooks/use-org";
import { useSanciones, type Sancion } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoImporte, formatoFecha, nivelPlazo, CLASES_ALERTA } from "@/shared/lib/formato";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: Calendario,
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

type Evento = { sancion: Sancion; fecha: string; tipo: string };

function Calendario() {
  const { data: sesion } = useSesion();
  const { data: sanciones, isLoading } = useSanciones(sesion?.organization?.id);
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());

  const eventos = useMemo<Evento[]>(() => {
    const out: Evento[] = [];
    for (const s of sanciones ?? []) {
      if (s.payment_deadline) out.push({ sancion: s, fecha: s.payment_deadline, tipo: "Pago" });
      if (s.appeal_deadline) out.push({ sancion: s, fecha: s.appeal_deadline, tipo: "Recurso" });
    }
    return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sanciones]);

  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];

  function eventosDia(dia: number) {
    const clave = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventos.filter((e) => e.fecha === clave);
  }

  function cambiarMes(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setMes(d.getMonth());
    setAnio(d.getFullYear());
  }

  const proximos = eventos
    .filter((e) => e.fecha >= new Date().toISOString().slice(0, 10))
    .slice(0, 10);

  return (
    <AppShell titulo="Calendario de plazos" descripcion="Vencimientos de pago y de recurso">
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-surface p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold capitalize text-navy">
                {MESES[mes]} {anio}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => cambiarMes(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {DIAS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {celdas.map((dia, i) => {
                if (dia === null) return <div key={`v-${i}`} className="min-h-20 rounded-md" />;
                const evs = eventosDia(dia);
                const esHoy =
                  dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
                return (
                  <div
                    key={dia}
                    className={`min-h-20 rounded-md border p-1.5 text-left ${
                      esHoy ? "border-navy bg-navy/5" : "border-border"
                    }`}
                  >
                    <span className="text-xs font-semibold text-muted-foreground">{dia}</span>
                    <div className="mt-1 space-y-1">
                      {evs.slice(0, 2).map((e) => (
                        <Link
                          key={`${e.sancion.id}-${e.tipo}`}
                          to="/sanciones/$id"
                          params={{ id: e.sancion.id }}
                          className={`block truncate rounded border px-1 py-0.5 text-[10px] font-medium ${
                            CLASES_ALERTA[nivelPlazo(e.fecha, e.sancion.status)]
                          }`}
                        >
                          {e.tipo}: {e.sancion.reference_number}
                        </Link>
                      ))}
                      {evs.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{evs.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Próximos vencimientos</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {proximos.map((e) => (
                <li
                  key={`${e.sancion.id}-${e.tipo}`}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/sanciones/$id"
                      params={{ id: e.sancion.id }}
                      className="text-sm font-semibold text-navy hover:underline"
                    >
                      {e.sancion.reference_number}
                    </Link>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        CLASES_ALERTA[nivelPlazo(e.fecha, e.sancion.status)]
                      }`}
                    >
                      {e.tipo}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatoFecha(e.fecha)} · {formatoImporte(e.sancion.original_amount)}
                  </p>
                  <div className="mt-2">
                    <EtiquetaEstado estado={e.sancion.status} />
                  </div>
                </li>
              ))}
              {proximos.length === 0 && (
                <li className="text-sm text-muted-foreground">No hay vencimientos próximos.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </AppShell>
  );
}
