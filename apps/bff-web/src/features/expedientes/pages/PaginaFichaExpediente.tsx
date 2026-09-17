import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { useSancion } from "@/features/expedientes";
import { CabeceraSancion } from "@/features/expedientes/components/CabeceraSancion";
import { ListaDocumentos } from "@/features/expedientes/components/ListaDocumentos";
import { ListaComentarios } from "@/features/expedientes/components/ListaComentarios";
import { HistorialActuaciones } from "@/features/expedientes/components/HistorialActuaciones";
import { SelectorEstado } from "@/features/expedientes/components/SelectorEstado";
import { PanelExtraccion } from "@/features/extraccion/components/PanelExtraccion";
import { PanelAnalisis } from "@/components/panel-analisis";

/**
 * Ficha de expediente. Antes era el componente `FichaSancion` (363 líneas) en
 * sanciones.$id.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2. Posee
 * `useSancion(id)` + `useSesion` y pasa datos por props a los sub-componentes.
 * `PanelAnalisis` se descompone en §3.4; aquí se consume como caja negra.
 */
export function PaginaFichaExpediente() {
  const { id } = useParams({ from: "/_authenticated/sanciones/$id" });
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const gestor = puedeGestionar(sesion?.role);

  const { data: sancion, isLoading } = useSancion(id);

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

  return (
    <AppShell
      titulo={`Expediente ${sancion.reference_number}`}
      descripcion={sancion.sanctioning_authority ?? "Sin organismo indicado"}
      acciones={
        gestor ? (
          <SelectorEstado
            orgId={orgId}
            userId={sesion?.userId}
            sancionId={id}
            estado={sancion.status}
          />
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
          <CabeceraSancion sancion={sancion} />
          <ListaDocumentos sancionId={id} />
          <PanelExtraccion sanctionId={id} />
          <ListaComentarios orgId={orgId} userId={sesion?.userId} sancionId={id} />
        </div>

        <div className="space-y-6">
          <PanelAnalisis
            sanctionId={id}
            puedeGestionar={gestor}
            esRevisor={sesion?.role === "revisor_juridico"}
            userId={sesion?.userId}
          />
          <HistorialActuaciones sancionId={id} />
        </div>
      </div>
    </AppShell>
  );
}
