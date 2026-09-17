import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tabla con paginación client-side opcional (off por defecto para no alterar la
 * UI actual). Preparada para la paginación server-side de RF-PERF-1/2 que entra
 * en Etapa 4 — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.1.
 */
export function TablaDatos<T>({
  columnas,
  filas,
  clave,
  paginar = false,
  tamanoPagina = 10,
  vacio,
}: {
  columnas: {
    key: string;
    cabecera: ReactNode;
    render: (fila: T) => ReactNode;
    className?: string;
  }[];
  filas: T[];
  clave: (fila: T) => string;
  paginar?: boolean;
  tamanoPagina?: number;
  vacio?: ReactNode;
}) {
  const [pagina, setPagina] = useState(0);

  if (!filas.length && vacio) return <>{vacio}</>;

  const totalPaginas = paginar ? Math.max(1, Math.ceil(filas.length / tamanoPagina)) : 1;
  const inicio = paginar ? pagina * tamanoPagina : 0;
  const visibles = paginar ? filas.slice(inicio, inicio + tamanoPagina) : filas;

  return (
    <div className="space-y-3">
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {columnas.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2 font-medium text-muted-foreground ${c.className ?? ""}`}
                >
                  {c.cabecera}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => (
              <tr key={clave(fila)} className="border-b border-border last:border-0">
                {columnas.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-top ${c.className ?? ""}`}>
                    {c.render(fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginar && totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {inicio + 1}–{Math.min(inicio + tamanoPagina, filas.length)} de {filas.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
