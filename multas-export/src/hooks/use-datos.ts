import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Vehiculo = {
  id: string;
  organization_id: string;
  registration_number: string;
  internal_code: string | null;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  status: string;
  created_at: string;
};

export type Conductor = {
  id: string;
  organization_id: string;
  full_name: string;
  identification_number: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export type Sancion = {
  id: string;
  organization_id: string;
  reference_number: string;
  sanctioning_authority: string | null;
  sanction_category: string | null;
  description: string | null;
  violation_date: string | null;
  notification_date: string | null;
  payment_deadline: string | null;
  appeal_deadline: string | null;
  original_amount: number | null;
  discounted_amount: number | null;
  points: number | null;
  vehicle_id: string | null;
  driver_id: string | null;
  status: string;
  recommended_action: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: { registration_number: string } | null;
  drivers?: { full_name: string } | null;
};

export function useVehiculos(orgId?: string | null) {
  return useQuery({
    queryKey: ["vehiculos", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("registration_number");
      if (error) throw error;
      return (data ?? []) as Vehiculo[];
    },
  });
}

export function useConductores(orgId?: string | null) {
  return useQuery({
    queryKey: ["conductores", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("organization_id", orgId!)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Conductor[];
    },
  });
}

export function useSanciones(orgId?: string | null) {
  return useQuery({
    queryKey: ["sanciones", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanctions")
        .select("*, vehicles(registration_number), drivers(full_name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Sancion[];
    },
  });
}
