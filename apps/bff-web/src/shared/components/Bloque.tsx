import type { ReactNode } from "react";

/**
 * Wrapper de sección con título. Antes vivía como helper local `Bloque` en
 * panel-analisis.tsx y como patrón suelto `text-xs font-medium uppercase
 * tracking-wide text-muted-foreground` en alta-documento.tsx —
 * ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.1.
 */
export function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}
