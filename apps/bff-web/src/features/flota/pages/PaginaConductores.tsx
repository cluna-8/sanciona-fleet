import { Link } from "@tanstack/react-router";
import { AppShell } from "@/shared/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { useConductores, type Conductor } from "@/features/flota";
import { useSanciones } from "@/features/expedientes";
import { DialogoConductor } from "@/features/flota/components/DialogoConductor";
import { formatoImporte } from "@/shared/lib/formato";

/**
 * Listado de conductores. Antes era el componente `Conductores` (263 líneas) en
 * conductores.index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.5.
 * Alta y edición viven en <DialogoConductor>.
 */
export function PaginaConductores() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: conductores, isLoading } = useConductores(orgId);
  const { data: sanciones } = useSanciones(orgId);
  const gestor = puedeGestionar(sesion?.role);

  return (
    <AppShell
      titulo="Conductores"
      descripcion="Personal de conducción asociado a la empresa"
      acciones={gestor ? <DialogoConductor modo="crear" /> : null}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (conductores ?? []).length === 0 ? (
        <div className="card-surface p-12 text-center text-sm text-muted-foreground">
          Todavía no hay conductores registrados.
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Conductor</th>
                <th className="px-5 py-3 font-medium">DNI / NIE</th>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Sanciones</th>
                <th className="px-5 py-3 font-medium">Importe acumulado</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                {gestor && <th className="px-5 py-3 font-medium text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {(conductores ?? []).map((c: Conductor) => {
                const propias = (sanciones ?? []).filter((s) => s.driver_id === c.id);
                const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to="/conductores/$id"
                        params={{ id: c.id }}
                        className="text-navy hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{c.identification_number ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="block">{c.email ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{c.phone ?? ""}</span>
                    </td>
                    <td className="px-5 py-3">{propias.length}</td>
                    <td className="px-5 py-3 tabular-nums">{formatoImporte(importe)}</td>
                    <td className="px-5 py-3">{c.status}</td>
                    {gestor && (
                      <td className="px-5 py-3 text-right">
                        <DialogoConductor modo="editar" conductor={c} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
