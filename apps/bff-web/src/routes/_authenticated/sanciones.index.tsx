import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Filter, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EtiquetaEstado, EtiquetaPrioridad, EtiquetaPlazo } from "@/components/etiquetas";
import { useSesion } from "@/hooks/use-org";
import { useSanciones, type Sancion } from "@/features/expedientes";
import { useVehiculos, useConductores } from "@/features/flota";
import { Button } from "@/components/ui/button";
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
import { ESTADOS_SANCION, PRIORIDADES, CATEGORIAS, formatoImporte } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/sanciones/")({
  component: ListadoSanciones,
});

const TODOS = "__todos__";

function plazoRelevante(s: Sancion) {
  const candidatos = [s.payment_deadline, s.appeal_deadline].filter(Boolean) as string[];
  if (!candidatos.length) return null;
  return candidatos.sort()[0]!;
}

function ListadoSanciones() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: sanciones, isLoading } = useSanciones(orgId);
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);

  const [estado, setEstado] = useState(TODOS);
  const [vehiculo, setVehiculo] = useState(TODOS);
  const [conductor, setConductor] = useState(TODOS);
  const [organismo, setOrganismo] = useState(TODOS);
  const [categoria, setCategoria] = useState(TODOS);
  const [prioridad, setPrioridad] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const organismos = useMemo(
    () =>
      [
        ...new Set((sanciones ?? []).map((s) => s.sanctioning_authority).filter(Boolean)),
      ] as string[],
    [sanciones],
  );

  const filtradas = useMemo(() => {
    return (sanciones ?? []).filter((s) => {
      if (estado !== TODOS && s.status !== estado) return false;
      if (vehiculo !== TODOS && s.vehicle_id !== vehiculo) return false;
      if (conductor !== TODOS && s.driver_id !== conductor) return false;
      if (organismo !== TODOS && s.sanctioning_authority !== organismo) return false;
      if (categoria !== TODOS && s.sanction_category !== categoria) return false;
      if (prioridad !== TODOS && s.priority !== prioridad) return false;
      const ref = s.violation_date ?? s.notification_date ?? s.created_at.slice(0, 10);
      if (desde && ref < desde) return false;
      if (hasta && ref > hasta) return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        const campos = [
          s.reference_number,
          s.sanctioning_authority,
          s.description,
          s.vehicles?.registration_number,
          s.drivers?.full_name,
        ];
        if (!campos.some((c) => c?.toLowerCase().includes(t))) return false;
      }
      return true;
    });
  }, [
    sanciones,
    estado,
    vehiculo,
    conductor,
    organismo,
    categoria,
    prioridad,
    desde,
    hasta,
    busqueda,
  ]);

  const hayFiltros =
    [estado, vehiculo, conductor, organismo, categoria, prioridad].some((v) => v !== TODOS) ||
    !!desde ||
    !!hasta ||
    !!busqueda;

  function limpiar() {
    setEstado(TODOS);
    setVehiculo(TODOS);
    setConductor(TODOS);
    setOrganismo(TODOS);
    setCategoria(TODOS);
    setPrioridad(TODOS);
    setDesde("");
    setHasta("");
    setBusqueda("");
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
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-navy" /> Filtros
          {hayFiltros && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={limpiar}>
              <X className="mr-1 h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FiltroSelect
            label="Estado"
            valor={estado}
            onChange={setEstado}
            opciones={ESTADOS_SANCION.map((e) => ({ value: e, label: e }))}
          />
          <FiltroSelect
            label="Matrícula"
            valor={vehiculo}
            onChange={setVehiculo}
            opciones={(vehiculos ?? []).map((v) => ({ value: v.id, label: v.registration_number }))}
          />
          <FiltroSelect
            label="Conductor"
            valor={conductor}
            onChange={setConductor}
            opciones={(conductores ?? []).map((c) => ({ value: c.id, label: c.full_name }))}
          />
          <FiltroSelect
            label="Organismo"
            valor={organismo}
            onChange={setOrganismo}
            opciones={organismos.map((o) => ({ value: o, label: o }))}
          />
          <FiltroSelect
            label="Categoría"
            valor={categoria}
            onChange={setCategoria}
            opciones={CATEGORIAS.map((c) => ({ value: c, label: c }))}
          />
          <FiltroSelect
            label="Prioridad"
            valor={prioridad}
            onChange={setPrioridad}
            opciones={PRIORIDADES.map((p) => ({ value: p, label: p }))}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs text-muted-foreground">Búsqueda libre</Label>
            <Input
              placeholder="Número de expediente, organismo, matrícula, conductor…"
              value={busqueda}
              maxLength={120}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-surface mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-sm text-muted-foreground">
          {filtradas.length} de {(sanciones ?? []).length} expedientes
        </div>
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No hay expedientes que coincidan con los filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Expediente</th>
                  <th className="px-5 py-3 font-medium">Organismo</th>
                  <th className="px-5 py-3 font-medium">Matrícula</th>
                  <th className="px-5 py-3 font-medium">Conductor</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Importe</th>
                  <th className="px-5 py-3 font-medium">Fecha límite</th>
                  <th className="px-5 py-3 font-medium">Prioridad</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <Link
                        to="/sanciones/$id"
                        params={{ id: s.id }}
                        className="font-medium text-navy hover:underline"
                      >
                        {s.reference_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{s.sanctioning_authority ?? "—"}</td>
                    <td className="px-5 py-3 font-medium">
                      {s.vehicles?.registration_number ?? "—"}
                    </td>
                    <td className="px-5 py-3">{s.drivers?.full_name ?? "—"}</td>
                    <td className="px-5 py-3">{s.sanction_category ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{formatoImporte(s.original_amount)}</td>
                    <td className="px-5 py-3">
                      <EtiquetaPlazo fecha={plazoRelevante(s)} estado={s.status} />
                    </td>
                    <td className="px-5 py-3">
                      <EtiquetaPrioridad prioridad={s.priority} />
                    </td>
                    <td className="px-5 py-3">
                      <EtiquetaEstado estado={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FiltroSelect({
  label,
  valor,
  onChange,
  opciones,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
