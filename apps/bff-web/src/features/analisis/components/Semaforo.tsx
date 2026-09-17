import {
  ACCION_RECOMENDADA_TEXTO,
  CLASES_SEMAFORO,
  SEMAFORO_TEXTO,
  type Semaforo,
} from "@/lib/analisis";
import type { Analisis } from "@/features/analisis";

/**
 * Tarjeta de semáforo del análisis: badge de semáforo, nivel de confianza,
 * sello de revisión jurídica, acción recomendada, justificación y próximo paso.
 * Antes era el bloque `rounded-lg border border-border p-4` inline en
 * panel-analisis.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function Semaforo({ analisis }: { analisis: Analisis }) {
  const semaforo = (analisis.traffic_light ?? "Gris") as Semaforo;
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${CLASES_SEMAFORO[semaforo]}`}
        >
          {SEMAFORO_TEXTO[semaforo]}
        </span>
        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          Confianza: {analisis.confidence_level}
        </span>
        {analisis.reviewed_at && (
          <span className="rounded-full border border-success/30 bg-success/12 px-2 py-0.5 text-[11px] text-success">
            Revisión jurídica realizada
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Acción recomendada
      </p>
      <p className="text-sm font-semibold text-navy">
        {ACCION_RECOMENDADA_TEXTO[analisis.recommendation ?? ""] ?? analisis.recommendation ?? "—"}
      </p>
      {analisis.rationale && <p className="mt-2 text-sm text-foreground">{analisis.rationale}</p>}
      {analisis.next_step && (
        <p className="mt-3 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Próximo paso:{" "}
          </span>
          {analisis.next_step}
        </p>
      )}
    </div>
  );
}
