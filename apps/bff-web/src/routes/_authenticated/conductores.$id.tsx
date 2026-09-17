import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { EtiquetaEstado } from "@/shared/components/EtiquetaEstado";
import { EtiquetaPrioridad } from "@/shared/components/EtiquetaPrioridad";
import { EtiquetaPlazo } from "@/shared/components/EtiquetaPlazo";
import { useSesion } from "@/hooks/use-org";
import { useConductores } from "@/features/flota";
import { useSanciones } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoImporte, formatoFecha } from "@/shared/lib/formato";

export const Route = createFileRoute("/_authenticated/conductores/$id")({
  component: FichaConductor,
});

function FichaConductor() {
  const { id } = Route.useParams();
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: conductores, isLoading } = useConductores(orgId);
  const { data: sanciones } = useSanciones(orgId);

  const conductor = (conductores ?? []).find((c) => c.id === id);
  const propias = (sanciones ?? []).filter((s) => s.driver_id === id);
  const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
  const puntos = propias.reduce((a, s) => a + Number(s.points ?? 0), 0);
  const vehiculos = [
    ...new Set(propias.map((s) => s.vehicles?.registration_number).filter(Boolean) as string[]),
  ];

  if (isLoading) {
    return (
      <AppShell titulo="Conductor">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!conductor) {
    return (
      <AppShell titulo="Conductor no encontrado">
        <div className="card-surface p-10 text-center text-[13px] text-muted-foreground">
          El conductor indicado no pertenece a la empresa activa o ha sido eliminado.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={conductor.full_name}
      descripcion="Ficha del conductor"
      acciones={
        <Button variant="outline" size="sm" asChild>
          <Link to="/conductores">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Volver
          </Link>
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Datos del conductor</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <Dato etiqueta="Nombre" valor={conductor.full_name} />
            <Dato etiqueta="Documento" valor={conductor.identification_number} />
            <Dato etiqueta="Correo" valor={conductor.email} />
            <Dato etiqueta="Teléfono" valor={conductor.phone} />
            <Dato etiqueta="Estado" valor={conductor.status} />
            <Dato etiqueta="Alta en el sistema" valor={formatoFecha(conductor.created_at)} />
          </dl>
        </div>

        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Resumen sancionador</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <Dato etiqueta="Expedientes asociados" valor={String(propias.length)} />
            <Dato etiqueta="Importe acumulado" valor={formatoImporte(importe)} />
            <Dato etiqueta="Puntos relacionados" valor={String(puntos)} />
          </dl>
        </div>

        <div className="card-surface p-4">
          <h2 className="text-[15px] font-medium">Vehículos utilizados</h2>
          {vehiculos.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              No constan vehículos asociados a sus expedientes.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {vehiculos.map((v) => (
                <li key={v} className="border-b border-border pb-1.5 last:border-0">
                  {v}
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
            Este conductor no tiene expedientes registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Expediente</th>
                  <th className="px-4 py-2 font-medium">Organismo</th>
                  <th className="px-4 py-2 font-medium">Matrícula</th>
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
                    <td className="px-4 py-2">{s.vehicles?.registration_number ?? "—"}</td>
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
