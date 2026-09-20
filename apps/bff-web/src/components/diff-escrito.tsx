import { useMemo } from "react";
import { diffEscrito, type TipoCambioEscrito } from "@/lib/diff-escrito";

/**
 * Diff visual entre dos versiones de un escrito (RF-BORRADOR-5).
 *
 * Cada línea lleva `data-tipo` (igual/anadida/eliminada) — el gancho de los
 * E2E — y un prefijo literal `− `/`+ ` para que el diff siga siendo legible
 * sin depender del color (accesibilidad).
 */

const PREFIJO: Record<TipoCambioEscrito, string> = {
  igual: "  ",
  anadida: "+ ",
  eliminada: "− ",
};

const CLASES: Record<TipoCambioEscrito, string> = {
  igual: "text-foreground",
  anadida: "bg-green-500/10 text-green-700",
  eliminada: "bg-red-500/10 text-red-700",
};

export function DiffEscrito({
  antes,
  despues,
  etiqueta,
}: {
  antes: string;
  despues: string;
  /** Descripción accesible de qué se está comparando. */
  etiqueta: string;
}) {
  const cambios = useMemo(() => diffEscrito(antes, despues), [antes, despues]);

  return (
    <div className="mt-3 space-y-2">
      <p className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-green-700">+ </span>añadida
        </span>
        <span>
          <span className="font-semibold text-red-700">− </span>eliminada
        </span>
      </p>
      <div
        role="region"
        aria-label={etiqueta}
        className="max-h-[420px] overflow-auto rounded-lg border border-border bg-secondary/40 p-4 text-[13px] leading-relaxed"
      >
        {cambios.length === 0 ? (
          <p className="text-muted-foreground">Sin diferencias.</p>
        ) : (
          cambios.map((cambio, indice) => (
            <div
              key={indice}
              data-tipo={cambio.tipo}
              className={`whitespace-pre-wrap px-1 ${CLASES[cambio.tipo]}`}
            >
              {PREFIJO[cambio.tipo]}
              {cambio.texto}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
