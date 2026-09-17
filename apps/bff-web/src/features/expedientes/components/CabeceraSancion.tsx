import { Truck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EtiquetaEstado } from "@/shared/components/EtiquetaEstado";
import { EtiquetaPrioridad } from "@/shared/components/EtiquetaPrioridad";
import { EtiquetaPlazo } from "@/shared/components/EtiquetaPlazo";
import { formatoImporte, formatoFecha } from "@/shared/lib/formato";
import type { Sancion } from "@sanciona/contracts";

/**
 * Cabecera de la ficha de expediente: etiquetas de estado/prioridad/plazo, `<dl>`
 * con los 10 datos clave y los bloques de hechos/notas. Antes era el primer
 * `card-surface` de `FichaSancion` en sanciones.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2.
 */
export function CabeceraSancion({ sancion }: { sancion: Sancion }) {
  const plazo =
    [sancion.payment_deadline, sancion.appeal_deadline].filter(Boolean).sort()[0] ?? null;

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <EtiquetaEstado estado={sancion.status} />
        <EtiquetaPrioridad prioridad={sancion.priority} />
        <EtiquetaPlazo fecha={plazo} estado={sancion.status} />
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Dato titulo="Categoría" valor={sancion.sanction_category ?? "—"} />
        <Dato titulo="Fecha infracción" valor={formatoFecha(sancion.violation_date)} />
        <Dato titulo="Notificación" valor={formatoFecha(sancion.notification_date)} />
        <Dato titulo="Límite de pago" valor={formatoFecha(sancion.payment_deadline)} />
        <Dato titulo="Límite de recurso" valor={formatoFecha(sancion.appeal_deadline)} />
        <Dato titulo="Puntos" valor={sancion.points != null ? String(sancion.points) : "—"} />
        <Dato titulo="Importe original" valor={formatoImporte(sancion.original_amount)} />
        <Dato
          titulo="Importe con reducción"
          valor={
            sancion.discounted_amount != null ? formatoImporte(sancion.discounted_amount) : "—"
          }
        />
        <Dato
          titulo="Vehículo"
          valor={sancion.vehicles?.registration_number ?? "Sin asignar"}
          icono={Truck}
        />
        <Dato titulo="Conductor" valor={sancion.drivers?.full_name ?? "Sin asignar"} icono={User} />
      </dl>
      {sancion.description && (
        <div className="mt-5 rounded-lg bg-secondary/60 p-4 text-sm text-foreground">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Hechos</p>
          {sancion.description}
        </div>
      )}
      {sancion.notes && (
        <div className="mt-3 rounded-lg border border-border p-4 text-sm">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notas internas</p>
          {sancion.notes}
        </div>
      )}
    </div>
  );
}

function Dato({
  titulo,
  valor,
  icono: Icono,
}: {
  titulo: string;
  valor: string;
  icono?: LucideIcon | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icono && <Icono className="h-3.5 w-3.5 text-navy" />}
        {valor}
      </dd>
    </div>
  );
}
