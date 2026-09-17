import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/hooks/use-org";
import { useSanciones } from "@/features/expedientes";
import { useVehiculos, useConductores } from "@/features/flota";
import { PanelFiltrosSanciones } from "../components/PanelFiltrosSanciones";
import { TablaSanciones } from "../components/TablaSanciones";
import {
  filtrosIniciales,
  filtrarSanciones,
  hayFiltrosActivos,
  type FiltrosSancion,
} from "../model/filtrosSanciones";

/**
 * Listado de sanciones con filtros. Antes era `routes/_authenticated/sanciones.index.tsx`
 * (293 líneas, 10 useState). Ahora los filtros viven en un único objeto
 * (1 useState) y la tabla/panel son componentes presentacionales. La ruta
 * queda sólo con `createFileRoute`. Ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.3.
 */
export function PaginaListadoSanciones() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: sanciones, isLoading } = useSanciones(orgId);
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);

  const [filtros, setFiltros] = useState<FiltrosSancion>(filtrosIniciales);

  const organismos = useMemo(
    () =>
      [
        ...new Set((sanciones ?? []).map((s) => s.sanctioning_authority).filter(Boolean)),
      ] as string[],
    [sanciones],
  );

  const filtradas = useMemo(() => filtrarSanciones(sanciones ?? [], filtros), [sanciones, filtros]);

  function onCambiar<K extends keyof FiltrosSancion>(clave: K, valor: FiltrosSancion[K]) {
    setFiltros((f) => ({ ...f, [clave]: valor }));
  }

  return (
    <AppShell
      titulo="Sanciones"
      descripcion="Listado completo de expedientes sancionadores de la empresa"
      acciones={
        <Button asChild>
          <Link to="/sanciones/nueva">
            <Plus className="mr-2 h-4 w-4" /> Nueva sanción
          </Link>
        </Button>
      }
    >
      <PanelFiltrosSanciones
        filtros={filtros}
        onCambiar={onCambiar}
        onLimpiar={() => setFiltros(filtrosIniciales)}
        hayFiltros={hayFiltrosActivos(filtros)}
        vehiculos={vehiculos}
        conductores={conductores}
        organismos={organismos}
      />
      <TablaSanciones
        sanciones={filtradas}
        total={(sanciones ?? []).length}
        isLoading={isLoading}
      />
    </AppShell>
  );
}
