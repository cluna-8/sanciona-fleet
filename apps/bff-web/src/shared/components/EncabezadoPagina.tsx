import type { ReactNode } from "react";

/**
 * Bloque de título + descripción + acciones de una página. Antes duplicado
 * como cabecera inline en AppShell y como `<h1>` sueltos en cada ruta —
 * ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.1.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string | undefined;
  acciones?: ReactNode | undefined;
}) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </>
  );
}
