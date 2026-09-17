import { Bloque } from "@/shared/components/Bloque";
import type { Analisis } from "@/features/analisis";

/**
 * Revisión de procedimiento del análisis. Antes era el bloque `Revisión de
 * procedimiento` inline en panel-analisis.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function RevisionProcedimiento({ revision }: { revision: Analisis["procedure_review"] }) {
  if (!revision || revision.length === 0) return null;
  return (
    <Bloque titulo="Revisión de procedimiento">
      <ul className="space-y-1.5 text-sm">
        {revision.map((r, i) => (
          <li key={i}>
            <span className="font-medium">{r.apartado}: </span>
            <span className="text-muted-foreground">
              {r.resultado}
              {r.detalle ? ` · ${r.detalle}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
