import { Bloque } from "@/shared/components/Bloque";
import type { Analisis } from "@/features/analisis";

/**
 * Factores detectados por el análisis. Antes era el bloque `Factores detectados`
 * inline en panel-analisis.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function Factores({ factores }: { factores: Analisis["factors"] }) {
  if (!factores || factores.length === 0) return null;
  return (
    <Bloque titulo="Factores detectados">
      <ul className="space-y-1.5">
        {factores.map((f, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
            <span>{f.texto}</span>
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
