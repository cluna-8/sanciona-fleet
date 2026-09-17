import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useComentarios, useAñadirComentario } from "@/features/expedientes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Comentarios internos de un expediente: caja de nuevo comentario + listado.
 * Antes era el bloque `Comentarios internos` inline en sanciones.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2. Posee su mutación `useAñadirComentario`.
 */
export function ListaComentarios({
  orgId,
  userId,
  sancionId,
}: {
  orgId: string | undefined;
  userId: string | undefined;
  sancionId: string;
}) {
  const { data: comentarios } = useComentarios(sancionId);
  const [comentario, setComentario] = useState("");

  const añadirComentarioMut = useAñadirComentario(orgId, userId, sancionId);
  const añadirComentario = {
    isPending: añadirComentarioMut.isPending,
    mutate: () =>
      añadirComentarioMut.mutate(comentario, {
        onSuccess: () => {
          setComentario("");
          toast.success("Comentario añadido");
        },
        onError: (e: Error) => toast.error(e.message),
      }),
  };

  return (
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
  );
}
