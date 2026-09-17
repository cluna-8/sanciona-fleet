import type { VersionBorrador } from "@/features/borradores";

/**
 * Listado de versiones guardadas del escrito, con toggle de comparación. Antes
 * era el bloque `Versiones` inline en borradores.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.6. El estado `comparar` lo posee
 * la página.
 */
export function ListaVersiones({
  versiones,
  comparar,
  onToggleComparar,
}: {
  versiones: VersionBorrador[];
  comparar: string;
  onToggleComparar: (id: string) => void;
}) {
  return (
    <div className="card-surface p-5">
      <h2 className="text-base font-semibold">Versiones</h2>
      <ul className="mt-3 space-y-2">
        {versiones.map((v) => (
          <li key={v.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Versión {v.version}</p>
              <button
                type="button"
                className="text-xs text-navy hover:underline"
                onClick={() => onToggleComparar(comparar === v.id ? "" : v.id)}
              >
                {comparar === v.id ? "Ocultar" : "Comparar"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(v.created_at).toLocaleString("es-ES")}
            </p>
            {v.change_note && <p className="mt-1 text-xs text-muted-foreground">{v.change_note}</p>}
          </li>
        ))}
        {versiones.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin versiones guardadas.</li>
        )}
      </ul>
    </div>
  );
}
