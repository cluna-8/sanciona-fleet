import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANES } from "@/lib/planes";

/**
 * Paso 2 del alta: elección de tarifa. Antes era el bloque `pasoAlta === 1`
 * inline en routes/index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7.
 */
export function PasoTarifa({
  cargando,
  onContratar,
  onVolver,
}: {
  cargando: boolean;
  onContratar: (planId: string, planNombre: string) => void;
  onVolver: () => void;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">Elige tu tarifa</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sin permanencia. Puedes cambiar de plan cuando quieras desde la configuración.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {PLANES.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col border p-5 ${
              plan.destacado ? "border-primary shadow-sm" : "border-border"
            }`}
          >
            {plan.destacado && (
              <span className="mb-3 w-fit bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                Más elegido
              </span>
            )}
            <h3 className="font-display text-lg font-bold">{plan.nombre}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.descripcion}</p>
            <p className="mt-3">
              <span className="font-display text-2xl font-bold">{plan.precio}</span>{" "}
              <span className="text-sm text-muted-foreground">{plan.periodo}</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.incluye.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{i}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-4"
              variant={plan.destacado ? "default" : "outline"}
              disabled={cargando}
              onClick={() => onContratar(plan.id, plan.nombre)}
            >
              {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Contratar {plan.nombre}
            </Button>
          </div>
        ))}
      </div>
      <Button variant="ghost" className="mt-6" onClick={onVolver} disabled={cargando}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis datos
      </Button>
    </section>
  );
}
