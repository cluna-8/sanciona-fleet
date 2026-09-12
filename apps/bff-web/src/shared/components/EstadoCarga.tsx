import { Skeleton } from "@/components/ui/skeleton";

/** Rejilla de esqueletos de carga, antes repetida a mano con distintos
 * tamaños en cada pantalla. */
export function EstadoCarga({ filas = 5, alto = "h-10" }: { filas?: number; alto?: string }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className={`${alto} w-full`} />
      ))}
    </div>
  );
}
