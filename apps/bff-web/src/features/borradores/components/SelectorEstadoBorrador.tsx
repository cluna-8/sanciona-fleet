import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ESTADOS_BORRADOR } from "@/lib/analisis";
import { formatoFecha } from "@/shared/lib/formato";
import type { BorradorConSancion } from "@/features/borradores";

/**
 * Estado y validación del escrito. Antes era el bloque `Estado y validación`
 * inline en borradores.$id.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.6. La mutación `useCambiarEstadoBorrador` la posee la página.
 */
export function SelectorEstadoBorrador({
  borrador,
  esRevisor,
  onCambiarEstado,
}: {
  borrador: BorradorConSancion;
  esRevisor: boolean;
  onCambiarEstado: (estado: string) => void;
}) {
  return (
    <div className="card-surface space-y-3 p-5">
      <h2 className="text-base font-semibold">Estado y validación</h2>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Estado del escrito</Label>
        <Select value={borrador.status} onValueChange={(v) => onCambiarEstado(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_BORRADOR.map((e) => (
              <SelectItem key={e} value={e} disabled={e === "Validado" && !esRevisor}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        La validación corresponde exclusivamente al revisor jurídico.
        {borrador.validated_at
          ? ` Validado el ${formatoFecha(borrador.validated_at.slice(0, 10))}.`
          : ""}
      </p>
    </div>
  );
}
