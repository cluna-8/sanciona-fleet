import { Link } from "@tanstack/react-router";
import { Bloque } from "@/shared/components/Bloque";
import { CLASES_ESTADO_BORRADOR } from "@/lib/analisis";
import { formatoFecha } from "@/shared/lib/formato";
import type { Borrador } from "@/features/borradores";

/**
 * Escritos (borradores) generados para el expediente. Antes era el bloque
 * `Escritos del expediente` inline en panel-analisis.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function ListaBorradores({ borradores }: { borradores: Borrador[] }) {
  if (borradores.length === 0) return null;
  return (
    <Bloque titulo="Escritos del expediente">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {borradores.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <Link
                to="/borradores/$id"
                params={{ id: b.id }}
                className="truncate text-sm font-medium text-navy hover:underline"
              >
                {b.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                Versión {b.current_version} · {formatoFecha(b.updated_at.slice(0, 10))}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                CLASES_ESTADO_BORRADOR[b.status] ?? ""
              }`}
            >
              {b.status}
            </span>
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
