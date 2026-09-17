import { cn } from "@/lib/utils";
import { CLASES_PRIORIDAD } from "@/shared/lib/formato";

export function EtiquetaPrioridad({ prioridad }: { prioridad?: string | null }) {
  if (!prioridad) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        CLASES_PRIORIDAD[prioridad] ?? "bg-secondary text-secondary-foreground border-border",
      )}
    >
      {prioridad}
    </span>
  );
}
