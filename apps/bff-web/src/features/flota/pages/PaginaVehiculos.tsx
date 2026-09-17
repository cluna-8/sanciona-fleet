import { Link } from "@tanstack/react-router";
import { AppShell } from "@/shared/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { useSanciones } from "@/features/expedientes";
import { useVehiculos, type Vehiculo } from "@/features/flota";
import { DialogoVehiculo } from "@/features/flota/components/DialogoVehiculo";
import { formatoImporte, formatoFecha } from "@/shared/lib/formato";

/**
 * Listado de vehículos de la flota. Antes era el componente `Vehiculos` (315
 * líneas) en vehiculos.index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.5. Alta y edición viven en <DialogoVehiculo>.
 */
export function PaginaVehiculos() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos, isLoading } = useVehiculos(orgId);
  const { data: sanciones } = useSanciones(orgId);
  const gestor = puedeGestionar(sesion?.role);

  return (
    <AppShell
      titulo="Vehículos"
      descripcion="Flota registrada en la empresa"
      acciones={gestor ? <DialogoVehiculo modo="crear" /> : null}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (vehiculos ?? []).length === 0 ? (
        <div className="card-surface p-12 text-center text-[13px] text-muted-foreground">
          Todavía no hay vehículos registrados.
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Matrícula</th>
                  <th className="px-4 py-2 font-medium">Código interno</th>
                  <th className="px-4 py-2 font-medium">Marca</th>
                  <th className="px-4 py-2 font-medium">Modelo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium text-right">Sanciones</th>
                  <th className="px-4 py-2 font-medium text-right">Importe acumulado</th>
                  <th className="px-4 py-2 font-medium">Última sanción</th>
                  {gestor && <th className="px-4 py-2 font-medium text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {(vehiculos ?? []).map((v: Vehiculo) => {
                  const propias = (sanciones ?? []).filter((s) => s.vehicle_id === v.id);
                  const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
                  const ultima = propias
                    .map((s) => s.notification_date ?? s.created_at.slice(0, 10))
                    .sort()
                    .at(-1);
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-4 py-2 font-medium">
                        <Link
                          to="/vehiculos/$id"
                          params={{ id: v.id }}
                          className="text-navy hover:underline"
                        >
                          {v.registration_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{v.internal_code ?? "—"}</td>
                      <td className="px-4 py-2">{v.brand ?? "—"}</td>
                      <td className="px-4 py-2">{v.model ?? "—"}</td>
                      <td className="px-4 py-2">{v.vehicle_type ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{v.status}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{propias.length}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatoImporte(importe)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {formatoFecha(ultima)}
                      </td>
                      {gestor && (
                        <td className="px-4 py-2 text-right">
                          <DialogoVehiculo modo="editar" vehiculo={v} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
