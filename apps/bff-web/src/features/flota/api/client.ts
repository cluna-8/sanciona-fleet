/**
 * Único módulo de la feature que conoce Supabase. Ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §2. Cuando exista fleet-service
 * (SPEC.md §7.1), este archivo cambia de implementación sin que ninguna ruta
 * ni componente se entere.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Vehiculo, Conductor } from "@sanciona/contracts";

export async function fetchVehiculos(orgId: string): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("organization_id", orgId)
    .order("registration_number");
  if (error) throw error;
  return (data ?? []) as Vehiculo[];
}

export async function fetchConductores(orgId: string): Promise<Conductor[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("organization_id", orgId)
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Conductor[];
}

export type NuevoVehiculo = {
  organization_id: string;
  registration_number: string;
  internal_code: string | null;
  brand: string | null;
  model: string | null;
  vehicle_type: string;
};

export async function crearVehiculo(datos: NuevoVehiculo): Promise<void> {
  const { error } = await supabase.from("vehicles").insert(datos as never);
  if (error) throw error;
}

export type CambiosVehiculo = {
  registration_number: string;
  internal_code: string | null;
  brand: string | null;
  model: string | null;
  vehicle_type: string;
  status: string;
};

export async function actualizarVehiculo(id: string, cambios: CambiosVehiculo): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update(cambios as never)
    .eq("id", id);
  if (error) throw error;
}

export type NuevoConductor = {
  organization_id: string;
  full_name: string;
  identification_number: string | null;
  email: string | null;
  phone: string | null;
};

export async function crearConductor(datos: NuevoConductor): Promise<void> {
  const { error } = await supabase.from("drivers").insert(datos as never);
  if (error) throw error;
}

export type CambiosConductor = {
  full_name: string;
  identification_number: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

export async function actualizarConductor(id: string, cambios: CambiosConductor): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update(cambios as never)
    .eq("id", id);
  if (error) throw error;
}
