import { Link } from "@tanstack/react-router";
import type { Sancion } from "@sanciona/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { EtiquetaEstado } from "@/shared/components/EtiquetaEstado";
import { EtiquetaPlazo } from "@/shared/components/EtiquetaPlazo";
import { EtiquetaPrioridad } from "@/shared/components/EtiquetaPrioridad";
import { formatoImporte } from "@/shared/lib/formato";
import { plazoRelevante } from "../model/filtrosSanciones";

/**
 * Tabla del listado de sanciones. Presentacional: recibe las sanciones ya
 * filtradas y el estado de carga. Antes estaba inline en `sanciones.index.tsx`.
 * Etapa 3.3.
 */
export function TablaSanciones({
  sanciones,
  total,
  isLoading,
}: {
  sanciones: Sancion[];
  total: number;
  isLoading: boolean;
}) {
  return (
    <div className="card-surface mt-6 overflow-hidden">
      <div className="border-b border-border px-5 py-3 text-sm text-muted-foreground">
        {sanciones.length} de {total} expedientes
      </div>
      {isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : sanciones.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
          No hay expedientes que coincidan con los filtros aplicados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Expediente</th>
                <th className="px-5 py-3 font-medium">Organismo</th>
                <th className="px-5 py-3 font-medium">Matrícula</th>
                <th className="px-5 py-3 font-medium">Conductor</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium">Importe</th>
                <th className="px-5 py-3 font-medium">Fecha límite</th>
                <th className="px-5 py-3 font-medium">Prioridad</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sanciones.map((s) => (
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
                  <td className="px-5 py-3">{s.sanctioning_authority ?? "—"}</td>
                  <td className="px-5 py-3 font-medium">
                    {s.vehicles?.registration_number ?? "—"}
                  </td>
                  <td className="px-5 py-3">{s.drivers?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">{s.sanction_category ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">{formatoImporte(s.original_amount)}</td>
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
  );
}
