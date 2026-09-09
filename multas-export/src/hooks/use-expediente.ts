import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Analisis = {
  id: string;
  sanction_id: string;
  status: string;
  recommendation: string | null;
  rationale: string | null;
  next_step: string | null;
  confidence_level: string;
  traffic_light: string;
  factors: { texto: string; tipo?: string }[];
  checklist: { documento: string; estado: string; nota?: string }[];
  coherence_issues: string[];
  procedure_review: { apartado: string; resultado: string; detalle?: string }[];
  evidence_review: { elemento: string; estado: string; detalle?: string }[];
  legal_refs: { norma: string; articulo?: string; url?: string; uso?: string }[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
};

export type Plazo = {
  id: string;
  deadline_type: string;
  start_date: string | null;
  end_date: string | null;
  document_date: string | null;
  calculation_basis: string | null;
  day_type: string;
  source: string;
  status: string;
  notes: string | null;
  last_verified_at: string;
};

export type Borrador = {
  id: string;
  sanction_id: string;
  kind: string;
  title: string;
  status: string;
  current_version: number;
  validated_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VersionBorrador = {
  id: string;
  version: number;
  content: string;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
};

export type Extraccion = {
  id: string;
  status: string;
  ocr_used: boolean;
  file_name: string;
  fields: Record<string, { valor: string | number | boolean | null; confianza: string; fuente?: string | null }>;
  confidence: Record<string, string>;
  warnings: string[];
  created_at: string;
};

export type Aviso = {
  id: string;
  sanction_id: string | null;
  notification_type: string;
  title: string;
  body: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

export function useAnalisis(sanctionId?: string) {
  return useQuery({
    queryKey: ["analisis", sanctionId],
    enabled: !!sanctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_analyses")
        .select("*")
        .eq("sanction_id", sanctionId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Analisis | null) ?? null;
    },
  });
}

export function usePlazos(sanctionId?: string) {
  return useQuery({
    queryKey: ["plazos", sanctionId],
    enabled: !!sanctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_deadlines")
        .select("*")
        .eq("sanction_id", sanctionId!)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Plazo[];
    },
  });
}

export function useBorradores(sanctionId?: string) {
  return useQuery({
    queryKey: ["borradores", sanctionId],
    enabled: !!sanctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_drafts")
        .select("*")
        .eq("sanction_id", sanctionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Borrador[];
    },
  });
}

export function useBorrador(draftId?: string) {
  return useQuery({
    queryKey: ["borrador", draftId],
    enabled: !!draftId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_drafts")
        .select("*, sanctions(reference_number, sanctioning_authority)")
        .eq("id", draftId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as
        | (Borrador & { sanctions: { reference_number: string; sanctioning_authority: string | null } | null })
        | null;
    },
  });
}

export function useVersiones(draftId?: string) {
  return useQuery({
    queryKey: ["borrador-versiones", draftId],
    enabled: !!draftId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_draft_versions")
        .select("id, version, content, change_note, created_at, created_by")
        .eq("draft_id", draftId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VersionBorrador[];
    },
  });
}

export function useExtraccion(sanctionId?: string) {
  return useQuery({
    queryKey: ["extraccion", sanctionId],
    enabled: !!sanctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanction_extractions")
        .select("id, status, ocr_used, file_name, fields, confidence, warnings, created_at")
        .eq("sanction_id", sanctionId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Extraccion | null) ?? null;
    },
  });
}

export function useAvisos(orgId?: string | null, soloNoLeidos = false) {
  return useQuery({
    queryKey: ["avisos", orgId, soloNoLeidos],
    enabled: !!orgId,
    queryFn: async () => {
      let consulta = supabase
        .from("notifications")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (soloNoLeidos) consulta = consulta.is("read_at", null);
      const { data, error } = await consulta;
      if (error) throw error;
      return (data ?? []) as unknown as Aviso[];
    },
  });
}
