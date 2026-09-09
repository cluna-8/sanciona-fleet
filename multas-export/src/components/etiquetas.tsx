import { cn } from "@/lib/utils";
import {
  CLASES_ESTADO,
  CLASES_PRIORIDAD,
  CLASES_ALERTA,
  nivelPlazo,
  formatoFecha,
  textoPlazo,
} from "@/lib/fleet";

export function EtiquetaEstado({ estado, className }: { estado?: string | null; className?: string }) {
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

export function EtiquetaPlazo({ fecha, estado }: { fecha?: string | null; estado?: string | null }) {
  const nivel = nivelPlazo(fecha, estado);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{formatoFecha(fecha)}</span>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
          CLASES_ALERTA[nivel],
        )}
      >
        {nivel === "archivado" ? "Archivado" : nivel === "resuelto" ? "Resuelto" : textoPlazo(fecha)}
      </span>
    </div>
  );
}
