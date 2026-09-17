import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { EtiquetaEstado } from "@/shared/components/EtiquetaEstado";
import { EtiquetaPrioridad } from "@/shared/components/EtiquetaPrioridad";
import { EtiquetaPlazo } from "@/shared/components/EtiquetaPlazo";
import { useSesion } from "@/hooks/use-org";
import { useVehiculos } from "@/features/flota";
import { useSanciones } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoImporte, formatoFecha } from "@/shared/lib/formato";

export const Route = createFileRoute("/_authenticated/vehiculos/$id")({
  component: FichaVehiculo,
});

function FichaVehiculo() {
  const { id } = Route.useParams();
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos, isLoading } = useVehiculos(orgId);
  const { data: sanciones } = useSanciones(orgId);

  const vehiculo = (vehiculos ?? []).find((v) => v.id === id);
  const propias = (sanciones ?? []).filter((s) => s.vehicle_id === id);
  const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
  const conductores = [
    ...new Set(propias.map((s) => s.drivers?.full_name).filter(Boolean) as string[]),
  ];

  if (isLoading) {
    return (
      <AppShell titulo="Vehículo">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!vehiculo) {
    return (
      <AppShell titulo="Vehículo no encontrado">
        <div className="card-surface p-10 text-center text-[13px] text-muted-foreground">
          El vehículo indicado no pertenece a la empresa activa o ha sido eliminado.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={vehiculo.registration_number}
      descripcion={
        [vehiculo.brand, vehiculo.model].filter(Boolean).join(" ") || "Ficha del vehículo"
      }
      acciones={
        <Button variant="outline" size="sm" asChild>
          <Link to="/vehiculos">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Volver
          </Link>
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Datos del vehículo</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <Dato etiqueta="Matrícula" valor={vehiculo.registration_number} />
            <Dato etiqueta="Código interno" valor={vehiculo.internal_code} />
            <Dato etiqueta="Marca" valor={vehiculo.brand} />
            <Dato etiqueta="Modelo" valor={vehiculo.model} />
            <Dato etiqueta="Tipo" valor={vehiculo.vehicle_type} />
            <Dato etiqueta="Estado" valor={vehiculo.status} />
            <Dato etiqueta="Alta en el sistema" valor={formatoFecha(vehiculo.created_at)} />
          </dl>
        </div>

        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Resumen sancionador</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <Dato etiqueta="Expedientes asociados" valor={String(propias.length)} />
            <Dato etiqueta="Importe acumulado" valor={formatoImporte(importe)} />
            <Dato
              etiqueta="Puntos acumulados"
              valor={String(propias.reduce((a, s) => a + Number(s.points ?? 0), 0))}
            />
          </dl>
        </div>

        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Conductores relacionados</h2>
          {conductores.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              No hay conductores identificados en los expedientes de este vehículo.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {conductores.map((c) => (
                <li key={c} className="border-b border-border pb-1.5 last:border-0">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card-surface mt-5 overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-[13px] text-muted-foreground">
          Sanciones asociadas ({propias.length})
        </div>
        {propias.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Este vehículo no tiene expedientes registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Expediente</th>
                  <th className="px-4 py-2 font-medium">Organismo</th>
                  <th className="px-4 py-2 font-medium">Conductor</th>
                  <th className="px-4 py-2 font-medium">Categoría</th>
                  <th className="px-4 py-2 font-medium text-right">Importe</th>
                  <th className="px-4 py-2 font-medium">Fecha límite</th>
                  <th className="px-4 py-2 font-medium">Prioridad</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {propias.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-2">
                      <Link
                        to="/sanciones/$id"
                        params={{ id: s.id }}
                        className="font-medium text-navy hover:underline"
                      >
                        {s.reference_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{s.sanctioning_authority ?? "—"}</td>
                    <td className="px-4 py-2">{s.drivers?.full_name ?? "—"}</td>
                    <td className="px-4 py-2">{s.sanction_category ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatoImporte(s.original_amount)}
                    </td>
                    <td className="px-4 py-2">
                      <EtiquetaPlazo fecha={s.payment_deadline} estado={s.status} />
                    </td>
                    <td className="px-4 py-2">
                      <EtiquetaPrioridad prioridad={s.priority} />
                    </td>
                    <td className="px-4 py-2">
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-right font-medium text-foreground">{valor || "—"}</dd>
    </div>
  );
}
