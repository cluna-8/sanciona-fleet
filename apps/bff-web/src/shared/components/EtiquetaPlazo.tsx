import { cn } from "@/lib/utils";
import { CLASES_ALERTA, nivelPlazo, formatoFecha, textoPlazo } from "@/shared/lib/formato";

export function EtiquetaPlazo({
  fecha,
  estado,
}: {
  fecha?: string | null;
  estado?: string | null;
}) {
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
        {nivel === "archivado"
          ? "Archivado"
          : nivel === "resuelto"
            ? "Resuelto"
            : textoPlazo(fecha)}
      </span>
    </div>
  );
}
