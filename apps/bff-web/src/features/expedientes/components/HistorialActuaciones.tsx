import { History } from "lucide-react";
import { useActuaciones } from "@/features/expedientes";

/**
 * Línea de tiempo de actuaciones sobre un expediente. Antes era el bloque
 * `Historial de actuaciones` inline en sanciones.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2.
 */
export function HistorialActuaciones({ sancionId }: { sancionId: string }) {
  const { data: actuaciones } = useActuaciones(sancionId);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-navy" />
        <h2 className="text-base font-semibold">Historial de actuaciones</h2>
      </div>
      <ol className="mt-4 space-y-4 border-l border-border pl-4">
        {(actuaciones ?? []).map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy" />
            <p className="text-sm font-medium">{a.action_type}</p>
            {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
            <p className="text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleString("es-ES")}
            </p>
          </li>
        ))}
        {(actuaciones ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Sin actuaciones registradas.</li>
        )}
      </ol>
    </div>
  );
}
