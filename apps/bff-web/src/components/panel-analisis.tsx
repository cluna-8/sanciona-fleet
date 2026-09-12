import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, FileSignature, Loader2, RefreshCw, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalisis, useRevisarAnalisis } from "@/features/analisis";
import { useBorradores } from "@/features/borradores";
import { usePlazos } from "@/features/plazos";
import { analizarExpediente, generarBorrador, recalcularPlazos } from "@/lib/expediente.functions";
import {
  ACCION_RECOMENDADA_TEXTO,
  CLASES_SEMAFORO,
  CLASES_ESTADO_BORRADOR,
  RECOMENDACIONES,
  SEMAFORO_TEXTO,
  type Semaforo,
} from "@/lib/analisis";
import { CLASES_ESTADO_PLAZO, type EstadoPlazo } from "@/lib/plazos";
import { formatoFecha } from "@/lib/fleet";

type Props = {
  sanctionId: string;
  puedeGestionar: boolean;
  esRevisor: boolean;
  userId?: string | undefined;
};

export function PanelAnalisis({ sanctionId, puedeGestionar, esRevisor, userId }: Props) {
  const queryClient = useQueryClient();
  const { data: analisis, isLoading } = useAnalisis(sanctionId);
  const { data: plazos } = usePlazos(sanctionId);
  const { data: borradores } = useBorradores(sanctionId);
  const [notaRevision, setNotaRevision] = useState("");

  const fnAnalizar = useServerFn(analizarExpediente);
  const fnBorrador = useServerFn(generarBorrador);
  const fnPlazos = useServerFn(recalcularPlazos);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["analisis", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["plazos", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["borradores", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["sancion", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["sancion-actions", sanctionId] });
  };

  const analizar = useMutation({
    mutationFn: () => fnAnalizar({ data: { sanctionId } }),
    onSuccess: () => {
      invalidar();
      toast.success("Análisis del expediente completado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const crearBorrador = useMutation({
    mutationFn: (kind: "Alegaciones" | "Recurso") => fnBorrador({ data: { sanctionId, kind } }),
    onSuccess: () => {
      invalidar();
      toast.success("Borrador generado. Requiere revisión y validación.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarPlazos = useMutation({
    mutationFn: () => fnPlazos({ data: { sanctionId } }),
    onSuccess: () => {
      invalidar();
      toast.success("Plazos recalculados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revisarMut = useRevisarAnalisis(sanctionId, analisis, userId);
  const revisar = {
    isPending: revisarMut.isPending,
    mutate: (cambios: { recommendation?: string; review_notes?: string; validar?: boolean }) =>
      revisarMut.mutate(cambios, {
        onSuccess: () => {
          invalidar();
          toast.success("Revisión registrada");
        },
        onError: (e: Error) => toast.error(e.message),
      }),
  };

  const semaforo = (analisis?.traffic_light ?? "Gris") as Semaforo;

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
              {ACCION_RECOMENDADA_TEXTO[analisis.recommendation ?? ""] ??
                analisis.recommendation ??
                "—"}
            </p>
            {analisis.rationale && (
              <p className="mt-2 text-sm text-foreground">{analisis.rationale}</p>
            )}
            {analisis.next_step && (
              <p className="mt-3 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Próximo paso:{" "}
                </span>
                {analisis.next_step}
              </p>
            )}
          </div>

          {analisis.factors?.length > 0 && (
            <Bloque titulo="Factores detectados">
              <ul className="space-y-1.5">
                {analisis.factors.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                    <span>{f.texto}</span>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

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

          {analisis.procedure_review?.length > 0 && (
            <Bloque titulo="Revisión de procedimiento">
              <ul className="space-y-1.5 text-sm">
                {analisis.procedure_review.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.apartado}: </span>
                    <span className="text-muted-foreground">
                      {r.resultado}
                      {r.detalle ? ` · ${r.detalle}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

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

          {analisis.legal_refs?.length > 0 && (
            <Bloque titulo="Fuentes utilizadas">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {analisis.legal_refs.map((f, i) => (
                  <li key={i}>
                    {f.norma}
                    {f.articulo ? `, ${f.articulo}` : ""}
                    {f.url && (
                      <>
                        {" · "}
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy hover:underline"
                        >
                          fuente oficial
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {esRevisor && (
            <Bloque titulo="Revisión jurídica">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Recomendación</Label>
                <Select
                  value={analisis.recommendation ?? "Revisar"}
                  onValueChange={(v) => revisar.mutate({ recommendation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMENDACIONES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-xs text-muted-foreground">Observaciones del revisor</Label>
                <Textarea
                  rows={3}
                  maxLength={1500}
                  value={notaRevision || (analisis.review_notes ?? "")}
                  onChange={(e) => setNotaRevision(e.target.value)}
                  placeholder="Argumentos añadidos, matices o motivos de la modificación…"
                />
                <Button
                  size="sm"
                  onClick={() => revisar.mutate({ review_notes: notaRevision, validar: true })}
                  disabled={revisar.isPending}
                >
                  {revisar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar revisión jurídica
                </Button>
              </div>
            </Bloque>
          )}

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

      {(borradores ?? []).length > 0 && (
        <Bloque titulo="Escritos del expediente">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(borradores ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <Link
                    to="/borradores/$id"
                    params={{ id: b.id }}
                    className="truncate text-sm font-medium text-navy hover:underline"
                  >
                    {b.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Versión {b.current_version} · {formatoFecha(b.updated_at.slice(0, 10))}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                    CLASES_ESTADO_BORRADOR[b.status] ?? ""
                  }`}
                >
                  {b.status}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}
