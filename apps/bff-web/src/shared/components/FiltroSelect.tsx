import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Sentinel "Todos" para los filtros de listado. Antes se declaraba como
 * `const TODOS = "__todos__"` independiente en sanciones.index, documentos y
 * sanciones.nueva — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.1.
 */
export const TODOS = "__todos__";

/**
 * Select de filtro con opción "Todos" incorporada. Antes repetido como helper
 * local `FiltroSelect` en sanciones.index.tsx — ver PLAN §3.1.
 */
export function FiltroSelect({
  label,
  valor,
  onChange,
  opciones,
  todosLabel = "Todos",
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
  todosLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>{todosLabel}</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
