import { Filter, X } from "lucide-react";
import { CATEGORIAS, ESTADOS_SANCION, PRIORIDADES } from "@sanciona/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiltroSelect } from "@/shared/components/FiltroSelect";
import type { FiltrosSancion } from "../model/filtrosSanciones";

type Vehiculo = { id: string; registration_number: string };
type Conductor = { id: string; full_name: string };

/**
 * Panel de filtros del listado de sanciones. Presentacional: recibe el estado
 * de filtros y un setter por clave. Antes estaba inline en
 * `sanciones.index.tsx`. Etapa 3.3.
 */
export function PanelFiltrosSanciones({
  filtros,
  onCambiar,
  onLimpiar,
  hayFiltros,
  vehiculos,
  conductores,
  organismos,
}: {
  filtros: FiltrosSancion;
  onCambiar: <K extends keyof FiltrosSancion>(clave: K, valor: FiltrosSancion[K]) => void;
  onLimpiar: () => void;
  hayFiltros: boolean;
  vehiculos: Vehiculo[] | undefined;
  conductores: Conductor[] | undefined;
  organismos: string[];
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="h-4 w-4 text-navy" /> Filtros
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onLimpiar}>
            <X className="mr-1 h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FiltroSelect
          label="Estado"
          valor={filtros.estado}
          onChange={(v) => onCambiar("estado", v)}
          opciones={ESTADOS_SANCION.map((e) => ({ value: e, label: e }))}
        />
        <FiltroSelect
          label="Matrícula"
          valor={filtros.vehiculo}
          onChange={(v) => onCambiar("vehiculo", v)}
          opciones={(vehiculos ?? []).map((v) => ({ value: v.id, label: v.registration_number }))}
        />
        <FiltroSelect
          label="Conductor"
          valor={filtros.conductor}
          onChange={(v) => onCambiar("conductor", v)}
          opciones={(conductores ?? []).map((c) => ({ value: c.id, label: c.full_name }))}
        />
        <FiltroSelect
          label="Organismo"
          valor={filtros.organismo}
          onChange={(v) => onCambiar("organismo", v)}
          opciones={organismos.map((o) => ({ value: o, label: o }))}
        />
        <FiltroSelect
          label="Categoría"
          valor={filtros.categoria}
          onChange={(v) => onCambiar("categoria", v)}
          opciones={CATEGORIAS.map((c) => ({ value: c, label: c }))}
        />
        <FiltroSelect
          label="Prioridad"
          valor={filtros.prioridad}
          onChange={(v) => onCambiar("prioridad", v)}
          opciones={PRIORIDADES.map((p) => ({ value: p, label: p }))}
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="date"
            value={filtros.desde}
            onChange={(e) => onCambiar("desde", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="date"
            value={filtros.hasta}
            onChange={(e) => onCambiar("hasta", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label className="text-xs text-muted-foreground">Búsqueda libre</Label>
          <Input
            placeholder="Número de expediente, organismo, matrícula, conductor…"
            value={filtros.busqueda}
            maxLength={120}
            onChange={(e) => onCambiar("busqueda", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
