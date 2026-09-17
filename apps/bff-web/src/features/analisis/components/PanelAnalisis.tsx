import { ClipboardCheck, FileSignature, Loader2, RefreshCw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bloque } from "@/shared/components/Bloque";
import {
  useAnalisis,
  useAnalizarExpediente,
  useGenerarBorrador,
  useRecalcularPlazos,
} from "@/features/analisis";
import { useBorradores } from "@/features/borradores";
import { usePlazos } from "@/features/plazos";
import { Semaforo } from "@/features/analisis/components/Semaforo";
import { Factores } from "@/features/analisis/components/Factores";
import { RevisionProcedimiento } from "@/features/analisis/components/RevisionProcedimiento";
import { Fuentes } from "@/features/analisis/components/Fuentes";
import { RevisionJuridica } from "@/features/analisis/components/RevisionJuridica";
import { ListaBorradores } from "@/features/analisis/components/ListaBorradores";
import { CLASES_ESTADO_PLAZO, type EstadoPlazo } from "@/lib/plazos";
import { formatoFecha } from "@/shared/lib/formato";

type Props = {
  sanctionId: string;
  puedeGestionar: boolean;
  esRevisor: boolean;
  userId?: string | undefined;
};

/**
 * Panel de análisis de un expediente. Antes era `src/components/panel-analisis.tsx`
 * (425 líneas, 1 useState) — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 * Las 4 mutaciones viven en `features/analisis/api/mutations.ts`; los bloques de
 * presentación en `features/analisis/components/*`. La sección de revisión
 * jurídica posee su propio estado. UI idéntica.
 */
export function PanelAnalisis({ sanctionId, puedeGestionar, esRevisor, userId }: Props) {
  const { data: analisis, isLoading } = useAnalisis(sanctionId);
  const { data: plazos } = usePlazos(sanctionId);
  const { data: borradores } = useBorradores(sanctionId);

  const analizar = useAnalizarExpediente(sanctionId);
  const crearBorrador = useGenerarBorrador(sanctionId);
  const actualizarPlazos = useRecalcularPlazos(sanctionId);

  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-navy" />
          <h2 className="text-base font-semibold">Análisis del expediente</h2>
        </div>
        {puedeGestionar && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => analizar.mutate()}
            disabled={analizar.isPending}
          >
            {analizar.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {analisis ? "Repetir análisis" : "Iniciar análisis del expediente"}
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Recomendación preliminar basada en los datos del expediente. Requiere validación
        profesional.
      </p>

      {/* Plazos */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Plazos
          </p>
          {puedeGestionar && (
            <button
              type="button"
              className="text-xs text-navy hover:underline"
              onClick={() => actualizarPlazos.mutate()}
            >
              Recalcular
            </button>
          )}
        </div>
        {(plazos ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin plazos calculados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {(plazos ?? []).map((p) => (
              <li key={p.id} className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.deadline_type}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      CLASES_ESTADO_PLAZO[p.status as EstadoPlazo] ?? CLASES_ESTADO_PLAZO.Calculado
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.end_date ? formatoFecha(p.end_date) : "Sin fecha"} · días {p.day_type} ·{" "}
                  {p.source === "documento"
                    ? "según documento"
                    : p.source === "calculo"
                      ? "cálculo interno"
                      : "documento y cálculo"}
                </p>
                {p.notes && <p className="mt-0.5 text-xs text-muted-foreground">{p.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando análisis…</p>}

      {!isLoading && !analisis && (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Este expediente todavía no se ha analizado. Inicia el análisis para obtener la
          recomendación preliminar, la documentación pendiente y los factores detectados.
        </p>
      )}

      {analisis && (
        <div className="mt-5 space-y-4">
          <Semaforo analisis={analisis} />

          <Factores factores={analisis.factors} />

          {analisis.checklist?.length > 0 && (
            <Bloque titulo="Documentación necesaria">
              <ul className="divide-y divide-border rounded-lg border border-border">
                {analisis.checklist.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>{c.documento}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.estado}</span>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          <RevisionProcedimiento revision={analisis.procedure_review} />

          {analisis.evidence_review?.length > 0 && (
            <Bloque titulo="Prueba">
              <ul className="space-y-1.5 text-sm">
                {analisis.evidence_review.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.elemento}: </span>
                    <span className="text-muted-foreground">
                      {r.estado}
                      {r.detalle ? ` · ${r.detalle}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {analisis.coherence_issues?.length > 0 && (
            <Bloque titulo="Datos que requieren comprobación">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {analisis.coherence_issues.map((c, i) => (
                  <li key={i}>· {c}</li>
                ))}
              </ul>
            </Bloque>
          )}

          <Fuentes refs={analisis.legal_refs} />

          <RevisionJuridica
            sanctionId={sanctionId}
            analisis={analisis}
            userId={userId}
            esRevisor={esRevisor}
          />

          {puedeGestionar && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => crearBorrador.mutate("Alegaciones")}
                disabled={crearBorrador.isPending}
              >
                {crearBorrador.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                )}
                Preparar alegaciones
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => crearBorrador.mutate("Recurso")}
                disabled={crearBorrador.isPending}
              >
                <ScrollText className="mr-1.5 h-3.5 w-3.5" /> Preparar recurso
              </Button>
            </div>
          )}
        </div>
      )}

      <ListaBorradores borradores={borradores ?? []} />
    </div>
  );
}
