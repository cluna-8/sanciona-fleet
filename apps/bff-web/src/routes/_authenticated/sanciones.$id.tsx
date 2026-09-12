import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Download,
  MessageSquare,
  History,
  Loader2,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EtiquetaEstado, EtiquetaPrioridad, EtiquetaPlazo } from "@/components/etiquetas";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sancion } from "@/hooks/use-datos";
import { PanelAnalisis } from "@/components/panel-analisis";
import { useExtraccion } from "@/hooks/use-expediente";
import { ETIQUETAS_CAMPO, valorTexto } from "@/lib/analisis";
import { ESTADOS_SANCION, formatoImporte, formatoFecha } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/sanciones/$id")({
  component: FichaSancion,
});

type Documento = {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
};
type Actuacion = {
  id: string;
  action_type: string;
  description: string | null;
  created_at: string;
};
type Comentario = { id: string; comment: string; created_at: string; created_by: string | null };

function FichaSancion() {
  const { id } = useParams({ from: "/_authenticated/sanciones/$id" });
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const queryClient = useQueryClient();
  const gestor = puedeGestionar(sesion?.role);
  const [comentario, setComentario] = useState("");

  const { data: sancion, isLoading } = useQuery({
    queryKey: ["sancion", id],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanctions")
        .select("*, vehicles(registration_number), drivers(full_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Sancion | null;
    },
  });

  const { data: documentos } = useQuery({
    queryKey: ["sancion-docs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_documents")
        .select("id, document_type, file_name, file_path, created_at")
        .eq("sanction_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Documento[];
    },
  });

  const { data: actuaciones } = useQuery({
    queryKey: ["sancion-actions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_actions")
        .select("id, action_type, description, created_at")
        .eq("sanction_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Actuacion[];
    },
  });

  const { data: comentarios } = useQuery({
    queryKey: ["sancion-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_comments")
        .select("id, comment, created_at, created_by")
        .eq("sanction_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Comentario[];
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: async (nuevo: string) => {
      if (!orgId || !sesion) throw new Error("Sesión no válida");
      const { error } = await supabase
        .from("sanctions")
        .update({ status: nuevo } as never)
        .eq("id", id);
      if (error) throw error;
      await supabase.from("sanction_actions").insert({
        organization_id: orgId,
        sanction_id: id,
        action_type: "Cambio de estado",
        description: `Estado actualizado a «${nuevo}».`,
        performed_by: sesion.userId,
      } as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sancion", id] });
      queryClient.invalidateQueries({ queryKey: ["sancion-actions", id] });
      queryClient.invalidateQueries({ queryKey: ["sanciones"] });
      toast.success("Estado actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const añadirComentario = useMutation({
    mutationFn: async () => {
      const texto = comentario.trim();
      if (!texto) throw new Error("El comentario no puede estar vacío");
      if (texto.length > 1000) throw new Error("Máximo 1000 caracteres");
      if (!orgId || !sesion) throw new Error("Sesión no válida");
      const { error } = await supabase.from("sanction_comments").insert({
        organization_id: orgId,
        sanction_id: id,
        comment: texto,
        created_by: sesion.userId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setComentario("");
      queryClient.invalidateQueries({ queryKey: ["sancion-comments", id] });
      toast.success("Comentario añadido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function descargar(doc: Documento) {
    const { data, error } = await supabase.storage
      .from("sanction-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error("No se pudo generar el enlace de descarga");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (isLoading) {
    return (
      <AppShell titulo="Expediente">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!sancion) {
    return (
      <AppShell titulo="Expediente no encontrado">
        <p className="text-sm text-muted-foreground">
          El expediente no existe o no pertenece a tu empresa.
        </p>
      </AppShell>
    );
  }

  const plazo =
    [sancion.payment_deadline, sancion.appeal_deadline].filter(Boolean).sort()[0] ?? null;

  return (
    <AppShell
      titulo={`Expediente ${sancion.reference_number}`}
      descripcion={sancion.sanctioning_authority ?? "Sin organismo indicado"}
      acciones={
        gestor ? (
          <div className="w-56">
            <Select value={sancion.status} onValueChange={(v) => cambiarEstado.mutate(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_SANCION.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null
      }
    >
      <Link
        to="/sanciones"
        className="mb-4 inline-flex items-center text-sm font-medium text-navy hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al listado
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
                  sancion.discounted_amount != null
                    ? formatoImporte(sancion.discounted_amount)
                    : "—"
                }
              />
              <Dato
                titulo="Vehículo"
                valor={sancion.vehicles?.registration_number ?? "Sin asignar"}
                icono={Truck}
              />
              <Dato
                titulo="Conductor"
                valor={sancion.drivers?.full_name ?? "Sin asignar"}
                icono={User}
              />
            </dl>
            {sancion.description && (
              <div className="mt-5 rounded-lg bg-secondary/60 p-4 text-sm text-foreground">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Hechos</p>
                {sancion.description}
              </div>
            )}
            {sancion.notes && (
              <div className="mt-3 rounded-lg border border-border p-4 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Notas internas
                </p>
                {sancion.notes}
              </div>
            )}
          </div>

          <div className="card-surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <FileText className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Documentos</h2>
            </div>
            {!documentos || documentos.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No hay documentos adjuntos en este expediente.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {documentos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.document_type} · {formatoFecha(d.created_at.slice(0, 10))}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => descargar(d)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PanelExtraccion sanctionId={id} />

          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Comentarios internos</h2>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Nuevo comentario</Label>
              <Textarea
                rows={3}
                maxLength={1000}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Anota observaciones para el equipo…"
              />
              <Button
                size="sm"
                onClick={() => añadirComentario.mutate()}
                disabled={añadirComentario.isPending}
              >
                {añadirComentario.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir comentario
              </Button>
            </div>
            <ul className="mt-5 space-y-3">
              {(comentarios ?? []).map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{c.comment}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("es-ES")}
                  </p>
                </li>
              ))}
              {(comentarios ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Todavía no hay comentarios.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <PanelAnalisis
            sanctionId={id}
            puedeGestionar={gestor}
            esRevisor={sesion?.role === "revisor_juridico"}
            userId={sesion?.userId}
          />

          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-navy" />
              <h2 className="text-base font-semibold">Historial de actuaciones</h2>
            </div>
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {(actuaciones ?? []).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy" />
                  <p className="text-sm font-medium">{a.action_type}</p>
                  {a.description && (
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("es-ES")}
                  </p>
                </li>
              ))}
              {(actuaciones ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Sin actuaciones registradas.</li>
              )}
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function PanelExtraccion({ sanctionId }: { sanctionId: string }) {
  const { data: extraccion } = useExtraccion(sanctionId);
  if (!extraccion) return null;
  const entradas = Object.entries(extraccion.fields ?? {});
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-navy" />
          <h2 className="text-base font-semibold">Extracción documental</h2>
        </div>
        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          {extraccion.status}
          {extraccion.ocr_used ? " · lectura óptica" : ""}
        </span>
      </div>
      {extraccion.warnings?.length > 0 && (
        <ul className="border-b border-border bg-accent/5 px-5 py-3 text-xs text-muted-foreground">
          {extraccion.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-2">
        {entradas.map(([clave, campo]) => (
          <div
            key={clave}
            className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1"
          >
            <span className="text-xs text-muted-foreground">{ETIQUETAS_CAMPO[clave] ?? clave}</span>
            <span className="text-right text-sm">
              {valorTexto(campo?.valor ?? null)}
              {campo?.confianza === "Bajo" && (
                <span className="ml-2 rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                  Verificar dato
                </span>
              )}
            </span>
          </div>
        ))}
        {entradas.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin datos extraídos del documento.</p>
        )}
      </div>
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
  icono?: React.ComponentType<{ className?: string }>;
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
