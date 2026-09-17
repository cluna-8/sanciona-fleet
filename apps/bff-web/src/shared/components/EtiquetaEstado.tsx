import { cn } from "@/lib/utils";
import { CLASES_ESTADO } from "@/shared/lib/formato";

export function EtiquetaEstado({
  estado,
  className,
}: {
  estado?: string | null;
  className?: string;
}) {
  if (!estado) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold",
        CLASES_ESTADO[estado] ?? "bg-secondary text-secondary-foreground border-border",
        className,
      )}
    >
      {estado}
    </span>
  );
}
