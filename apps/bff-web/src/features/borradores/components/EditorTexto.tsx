import { FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Editor del texto del escrito + nota de cambios + guardar versión. Antes era
 * el bloque `Texto del escrito` inline en borradores.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.6. El estado `texto`/`nota` lo
 * posee la página (se resetea por remount al cambiar de borrador).
 */
export function EditorTexto({
  texto,
  onTextoChange,
  nota,
  onNotaChange,
  onGuardar,
  guardando,
  editable,
}: {
  texto: string;
  onTextoChange: (v: string) => void;
  nota: string;
  onNotaChange: (v: string) => void;
  onGuardar: () => void;
  guardando: boolean;
  editable: boolean;
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-navy" />
        <h2 className="text-base font-semibold">Texto del escrito</h2>
      </div>
      <Textarea
        className="mt-3 min-h-[520px] text-[13px] [font-family:Arial,Helvetica,sans-serif] leading-relaxed"
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        disabled={!editable}
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nota de cambios</Label>
          <Input
            value={nota}
            maxLength={200}
            onChange={(e) => onNotaChange(e.target.value)}
            placeholder="Describe brevemente los cambios realizados"
          />
        </div>
        <Button onClick={onGuardar} disabled={guardando || !editable}>
          {guardando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar versión
        </Button>
      </div>
    </div>
  );
}
