import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { AltaDesdeDocumento } from "@/features/extraccion";
import { useSesion } from "@/hooks/use-org";
import { FormularioSancionManual } from "@/features/expedientes/components/FormularioSancionManual";

/**
 * Página "Nueva sanción": wizard de subida de documento + alta manual. Antes
 * era `routes/_authenticated/sanciones.nueva.tsx` (276 líneas, 9 useState).
 * La ruta queda sólo con `createFileRoute`. Ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.3.
 */
export function PaginaNuevaSancion() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;

  return (
    <AppShell titulo="Nueva sanción" descripcion="Registra un expediente sancionador">
      <Link
        to="/sanciones"
        className="mb-4 inline-flex items-center text-sm font-medium text-navy hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al listado
      </Link>

      <div className="mb-6">
        <AltaDesdeDocumento orgId={orgId} userId={sesion?.userId} />
      </div>

      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Alta manual del expediente
        </h2>
        <p className="text-xs text-muted-foreground">
          Introduce o corrige los datos manualmente como alternativa al documento.
        </p>
      </div>

      <FormularioSancionManual />
    </AppShell>
  );
}
