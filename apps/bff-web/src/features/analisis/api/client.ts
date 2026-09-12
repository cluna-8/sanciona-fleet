/** Único módulo que conoce Supabase para sanction_analyses. La generación del
 * análisis en sí es un server fn (lib/expediente.functions.ts) que llama a
 * @sanciona/ai-provider — SPEC.md §7.1 (analysis-service). */
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

export async function fetchAnalisis(sanctionId: string): Promise<Analisis | null> {
  const { data, error } = await supabase
    .from("sanction_analyses")
    .select("*")
    .eq("sanction_id", sanctionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Analisis | null) ?? null;
}

export type CambiosRevision = {
  recommendation?: string;
  review_notes?: string;
  validar?: boolean;
};

export async function revisarAnalisis(
  id: string,
  cambios: CambiosRevision,
  userId: string | undefined,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (cambios.recommendation) payload["recommendation"] = cambios.recommendation;
  if (cambios.review_notes !== undefined) payload["review_notes"] = cambios.review_notes;
  if (cambios.validar) {
    payload["reviewed_by"] = userId ?? null;
    payload["reviewed_at"] = new Date().toISOString();
  }
  const { error } = await supabase
    .from("sanction_analyses")
    .update(payload as never)
    .eq("id", id);
  if (error) throw error;
}
