import { FileText } from "lucide-react";
import { useExtraccion } from "@/features/extraccion";
import { ETIQUETAS_CAMPO, valorTexto } from "@/lib/analisis";

/**
 * Panel de extracción documental de un expediente. Antes era el componente local
 * `PanelExtraccion` en sanciones.$id.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.2. Autocontenido: obtiene su extracción por `sanctionId`.
 */
export function PanelExtraccion({ sanctionId }: { sanctionId: string }) {
  const { data: extraccion } = useExtraccion(sanctionId);
  if (!extraccion) return null;
  const entradas = Object.entries(extraccion.fields ?? {});
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-navy" />
          <h2 className="text-base font-semibold">Extracción documental</h2>
        </div>
        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          {extraccion.status}
          {extraccion.ocr_used ? " · lectura óptica" : ""}
        </span>
      </div>
      {extraccion.warnings?.length > 0 && (
        <ul className="border-b border-border bg-accent/5 px-5 py-3 text-xs text-muted-foreground">
          {extraccion.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-2">
        {entradas.map(([clave, campo]) => (
          <div
            key={clave}
            className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1"
          >
            <span className="text-xs text-muted-foreground">{ETIQUETAS_CAMPO[clave] ?? clave}</span>
            <span className="text-right text-sm">
              {valorTexto(campo?.valor ?? null)}
              {campo?.confianza === "Bajo" && (
                <span className="ml-2 rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                  Verificar dato
                </span>
              )}
            </span>
          </div>
        ))}
        {entradas.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin datos extraídos del documento.</p>
        )}
      </div>
    </div>
  );
}
