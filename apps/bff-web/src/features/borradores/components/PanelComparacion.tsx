import { Button } from "@/components/ui/button";
import type { VersionBorrador } from "@/features/borradores";

/**
 * Vista de una versión para comparar contra el editor, con acción de restaurar
 * su texto. Antes era el bloque `Versión N` inline en borradores.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.6.
 */
export function PanelComparacion({
  version,
  onRestaurar,
}: {
  version: VersionBorrador | undefined;
  onRestaurar: (contenido: string) => void;
}) {
  if (!version) return null;
  return (
    <div className="card-surface p-5">
      <h2 className="text-base font-semibold">Versión {version.version}</h2>
      <p className="text-xs text-muted-foreground">
        {new Date(version.created_at).toLocaleString("es-ES")} · {version.change_note ?? "Sin nota"}
      </p>
      <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-[13px] leading-relaxed [font-family:Arial,Helvetica,sans-serif]">
        {version.content}
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={() => onRestaurar(version.content)}
      >
        Restaurar este texto en el editor
      </Button>
    </div>
  );
}
