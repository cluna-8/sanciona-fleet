import type { Sancion } from "@sanciona/contracts";
import { TODOS } from "@/shared/components/FiltroSelect";

/**
 * Estado de los filtros del listado de sanciones, agrupado en un único objeto
 * para sustituir los 10 `useState` sueltos del `sanciones.index.tsx` original.
 * El centinela `TODOS` viene de `@/shared/components/FiltroSelect`. Etapa 3.3.
 */
export type FiltrosSancion = {
  estado: string;
  vehiculo: string;
  conductor: string;
  organismo: string;
  categoria: string;
  prioridad: string;
  desde: string;
  hasta: string;
  busqueda: string;
};

export const filtrosIniciales: FiltrosSancion = {
  estado: TODOS,
  vehiculo: TODOS,
  conductor: TODOS,
  organismo: TODOS,
  categoria: TODOS,
  prioridad: TODOS,
  desde: "",
  hasta: "",
  busqueda: "",
};

/** Fecha límite más próxima entre pago y recurso (la que vence antes). */
export function plazoRelevante(s: Sancion): string | null {
  const candidatos = [s.payment_deadline, s.appeal_deadline].filter(Boolean) as string[];
  if (!candidatos.length) return null;
  return candidatos.sort()[0]!;
}

/** Aplica los filtros activos a la lista de sanciones. */
export function filtrarSanciones(sanciones: Sancion[], f: FiltrosSancion): Sancion[] {
  return sanciones.filter((s) => {
    if (f.estado !== TODOS && s.status !== f.estado) return false;
    if (f.vehiculo !== TODOS && s.vehicle_id !== f.vehiculo) return false;
    if (f.conductor !== TODOS && s.driver_id !== f.conductor) return false;
    if (f.organismo !== TODOS && s.sanctioning_authority !== f.organismo) return false;
    if (f.categoria !== TODOS && s.sanction_category !== f.categoria) return false;
    if (f.prioridad !== TODOS && s.priority !== f.prioridad) return false;
    const ref = s.violation_date ?? s.notification_date ?? s.created_at.slice(0, 10);
    if (f.desde && ref < f.desde) return false;
    if (f.hasta && ref > f.hasta) return false;
    if (f.busqueda) {
      const t = f.busqueda.toLowerCase();
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
}

/** ¿Hay algún filtro activo (no todo por defecto)? */
export function hayFiltrosActivos(f: FiltrosSancion): boolean {
  return (
    [f.estado, f.vehiculo, f.conductor, f.organismo, f.categoria, f.prioridad].some(
      (v) => v !== TODOS,
    ) ||
    !!f.desde ||
    !!f.hasta ||
    !!f.busqueda
  );
}
