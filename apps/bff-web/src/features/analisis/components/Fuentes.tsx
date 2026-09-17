import { Bloque } from "@/shared/components/Bloque";
import type { Analisis } from "@/features/analisis";

/**
 * Fuentes legales utilizadas por el análisis. Antes era el bloque `Fuentes
 * utilizadas` inline en panel-analisis.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function Fuentes({ refs }: { refs: Analisis["legal_refs"] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <Bloque titulo="Fuentes utilizadas">
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {refs.map((f, i) => (
          <li key={i}>
            {f.norma}
            {f.articulo ? `, ${f.articulo}` : ""}
            {f.url && (
              <>
                {" · "}
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy hover:underline"
                >
                  fuente oficial
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
