import type { LucideIcon } from "lucide-react";

/**
 * Tarjeta de indicador numérico, antes reconstruida a mano en cada pantalla
 * (dashboard, informes, prevención). Ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.1.
 */
export function TarjetaKpi({
  titulo,
  valor,
  icono: Icono,
  detalle,
  acento = "text-navy",
}: {
  titulo: string;
  valor: string;
  icono: LucideIcon;
  detalle?: string;
  acento?: string;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        <Icono className={`h-4 w-4 ${acento}`} />
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}
