import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, FileDown, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import {
  useBorrador,
  useVersiones,
  useGuardarVersion,
  useCambiarEstadoBorrador,
} from "@/features/borradores";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASES_ESTADO_BORRADOR, ESTADOS_BORRADOR } from "@/lib/analisis";
import { formatoFecha } from "@/lib/fleet";
import { exportarBorrador } from "@/lib/borradores.functions";

export const Route = createFileRoute("/_authenticated/borradores/$id")({
  component: EditorBorrador,
  head: () => ({
    meta: [
      { title: "Editor de escritos · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Edita, versiona y valida los borradores de alegaciones y recursos de cada expediente sancionador.",
      },
    ],
  }),
});

function EditorBorrador() {
  const { id } = useParams({ from: "/_authenticated/borradores/$id" });
  const { data: sesion } = useSesion();
  const gestor = puedeGestionar(sesion?.role);
  const esRevisor = sesion?.role === "revisor_juridico";

  const { data: borrador, isLoading } = useBorrador(id);
  const { data: versiones } = useVersiones(id);

  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [comparar, setComparar] = useState<string>("");
  const [cargado, setCargado] = useState(false);

  const ultima = versiones?.[0];

  useEffect(() => {
    if (!cargado && ultima) {
      setTexto(ultima.content);
      setCargado(true);
    }
  }, [ultima, cargado]);

  const guardarMut = useGuardarVersion(
    id,
    borrador,
    sesion?.organization?.id,
    sesion?.userId,
    ultima?.version ?? 0,
  );
  const guardar = {
    isPending: guardarMut.isPending,
    mutate: () =>
      guardarMut.mutate(
        { texto, nota },
        {
          onSuccess: () => {
            setNota("");
            toast.success("Versión guardada");
          },
          onError: (e: Error) => toast.error(e.message),
        },
      ),
  };

  const cambiarEstadoMut = useCambiarEstadoBorrador(
    id,
    borrador,
    sesion?.organization?.id,
    sesion?.userId,
    esRevisor,
  );
  const cambiarEstado = {
    mutate: (estado: string) =>
      cambiarEstadoMut.mutate(estado, {
        onSuccess: () => toast.success("Estado actualizado"),
        onError: (e: Error) => toast.error(e.message),
      }),
  };

  // Exportación real en servidor (RF-BORRADOR-3/4): siempre exporta la última
  // versión guardada; si el editor está sucio se avisa en lugar de mentir.
  const fnExportar = useServerFn(exportarBorrador);
  const exportar = useMutation({
    mutationFn: (formato: "pdf" | "docx") => {
      const organizationId = sesion?.organization?.id;
      if (!organizationId) throw new Error("Tu usuario no tiene una empresa activa asignada.");
      return fnExportar({ data: { draftId: id, organizationId, formato } });
    },
    onSuccess: (res) => {
      if (texto !== (ultima?.content ?? "")) {
        toast.info(
          `Se ha exportado la última versión guardada (v ${res.version}). Guarda tus cambios para incluirlos.`,
        );
      }
      window.location.assign(res.url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell titulo="Escrito">
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  if (!borrador) {
    return (
      <AppShell titulo="Escrito no encontrado">
        <p className="text-sm text-muted-foreground">
          El escrito no existe o no pertenece a tu empresa.
        </p>
      </AppShell>
    );
  }

  const versionComparada = (versiones ?? []).find((v) => v.id === comparar);

  return (
    <AppShell
      titulo={borrador.title}
      descripcion={`Expediente ${borrador.sanctions?.reference_number ?? "—"} · ${borrador.kind}`}
      acciones={
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${CLASES_ESTADO_BORRADOR[borrador.status] ?? ""}`}
        >
          {borrador.status}
        </span>
      }
    >
      <Link
        to="/sanciones/$id"
        params={{ id: borrador.sanction_id }}
        className="mb-4 inline-flex items-center text-sm font-medium text-navy hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al expediente
      </Link>

      {borrador.status !== "Validado" && (
        <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-foreground">
          Documento pendiente de validación. No debe presentarse hasta que un revisor jurídico lo
          valide.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Texto del escrito</h2>
            </div>
            <Textarea
              className="mt-3 min-h-[520px] text-[13px] [font-family:Arial,Helvetica,sans-serif] leading-relaxed"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={!gestor && !esRevisor}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nota de cambios</Label>
                <Input
                  value={nota}
                  maxLength={200}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Describe brevemente los cambios realizados"
                />
              </div>
              <Button
                onClick={() => guardar.mutate()}
                disabled={guardar.isPending || (!gestor && !esRevisor)}
              >
                {guardar.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar versión
              </Button>
            </div>
          </div>

          {versionComparada && (
            <div className="card-surface p-5">
              <h2 className="text-base font-semibold">Versión {versionComparada.version}</h2>
              <p className="text-xs text-muted-foreground">
                {new Date(versionComparada.created_at).toLocaleString("es-ES")} ·{" "}
                {versionComparada.change_note ?? "Sin nota"}
              </p>
              <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-[13px] leading-relaxed [font-family:Arial,Helvetica,sans-serif]">
                {versionComparada.content}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setTexto(versionComparada.content)}
              >
                Restaurar este texto en el editor
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-surface space-y-3 p-5">
            <h2 className="text-base font-semibold">Estado y validación</h2>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado del escrito</Label>
              <Select value={borrador.status} onValueChange={(v) => cambiarEstado.mutate(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BORRADOR.map((e) => (
                    <SelectItem key={e} value={e} disabled={e === "Validado" && !esRevisor}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              La validación corresponde exclusivamente al revisor jurídico.
              {borrador.validated_at
                ? ` Validado el ${formatoFecha(borrador.validated_at.slice(0, 10))}.`
                : ""}
            </p>
          </div>

          <div className="card-surface space-y-2 p-5">
            <h2 className="text-base font-semibold">Exportar</h2>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={exportar.isPending}
              onClick={() => exportar.mutate("pdf")}
            >
              {exportar.isPending && exportar.variables === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Exportar a PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={exportar.isPending}
              onClick={() => exportar.mutate("docx")}
            >
              {exportar.isPending && exportar.variables === "docx" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar .docx
            </Button>
          </div>

          <div className="card-surface p-5">
            <h2 className="text-base font-semibold">Versiones</h2>
            <ul className="mt-3 space-y-2">
              {(versiones ?? []).map((v) => (
                <li key={v.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Versión {v.version}</p>
                    <button
                      type="button"
                      className="text-xs text-navy hover:underline"
                      onClick={() => setComparar(comparar === v.id ? "" : v.id)}
                    >
                      {comparar === v.id ? "Ocultar" : "Comparar"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString("es-ES")}
                  </p>
                  {v.change_note && (
                    <p className="mt-1 text-xs text-muted-foreground">{v.change_note}</p>
                  )}
                </li>
              ))}
              {(versiones ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Sin versiones guardadas.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
