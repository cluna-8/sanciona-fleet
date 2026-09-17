import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/shared/components/AppShell";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import {
  useBorrador,
  useVersiones,
  useGuardarVersion,
  useCambiarEstadoBorrador,
} from "@/features/borradores";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditorTexto } from "@/features/borradores/components/EditorTexto";
import { PanelComparacion } from "@/features/borradores/components/PanelComparacion";
import { ListaVersiones } from "@/features/borradores/components/ListaVersiones";
import { SelectorEstadoBorrador } from "@/features/borradores/components/SelectorEstadoBorrador";
import { CLASES_ESTADO_BORRADOR } from "@/lib/analisis";
import { documentoHtml } from "@/lib/documento";

/**
 * Editor de borradores (alegaciones/recursos). Antes era `EditorBorrador` (308
 * líneas) en borradores.$id.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.6. La ruta monta esta página con `key={id}` para forzar remount al cambiar
 * de escrito.
 *
 * Fix del bug de pérdida de edición: el estado `cargado` (booleano plano, no
 * keyado por id) hacía que al navegar de un borrador A→B sin remount el editor
 * conservase el texto de A. Ahora la página se remonta por id, y la
 * sincronización inicial usa una ref que se reinicia con cada remount — ver
 * docs/refactor/CAMBIOS-LOVABLE.md §4.
 */
export function PaginaEditorBorrador({ id }: { id: string }) {
  const { data: sesion } = useSesion();
  const gestor = puedeGestionar(sesion?.role);
  const esRevisor = sesion?.role === "revisor_juridico";

  const { data: borrador, isLoading } = useBorrador(id);
  const { data: versiones } = useVersiones(id);

  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [comparar, setComparar] = useState("");
  const sincronizado = useRef(false);

  const ultima = versiones?.[0];

  // Sincronización inicial: carga el texto de la última versión una sola vez
  // por borrador. La ref se reinicia en cada remount (key={id}), por lo que
  // cambiar de escrito recarga su texto en vez de conservar el anterior.
  useEffect(() => {
    if (!sincronizado.current && ultima) {
      setTexto(ultima.content);
      sincronizado.current = true;
    }
  }, [ultima]);

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

  function exportarPdf() {
    const ventana = window.open("", "_blank", "noopener,width=900,height=1000");
    if (!ventana) return;
    ventana.document.write(documentoHtml(borrador?.title ?? "Escrito", texto));
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  function exportarDocumento() {
    const blob = new Blob([documentoHtml(borrador?.title ?? "Escrito", texto)], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(borrador?.title ?? "escrito").replace(/[^\w\s.-]/g, "")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
  const editable = gestor || esRevisor;

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
          <EditorTexto
            texto={texto}
            onTextoChange={setTexto}
            nota={nota}
            onNotaChange={setNota}
            onGuardar={guardar.mutate}
            guardando={guardar.isPending}
            editable={editable}
          />
          <PanelComparacion version={versionComparada} onRestaurar={setTexto} />
        </div>

        <div className="space-y-6">
          <SelectorEstadoBorrador
            borrador={borrador}
            esRevisor={esRevisor}
            onCambiarEstado={cambiarEstado.mutate}
          />

          <div className="card-surface space-y-2 p-5">
            <h2 className="text-base font-semibold">Exportar</h2>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={exportarPdf}
            >
              <Printer className="mr-2 h-4 w-4" /> Exportar a PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={exportarDocumento}
            >
              <Download className="mr-2 h-4 w-4" /> Descargar documento editable
            </Button>
          </div>

          <ListaVersiones
            versiones={versiones ?? []}
            comparar={comparar}
            onToggleComparar={setComparar}
          />
        </div>
      </div>
    </AppShell>
  );
}
