-- 1. EXTRACCIONES DOCUMENTALES
CREATE TABLE public.sanction_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid REFERENCES public.sanctions(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.sanction_documents(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  status text NOT NULL DEFAULT 'Documento recibido',
  ocr_used boolean NOT NULL DEFAULT false,
  raw_text text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_extractions TO authenticated;
GRANT ALL ON public.sanction_extractions TO service_role;
ALTER TABLE public.sanction_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY extractions_select ON public.sanction_extractions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY extractions_insert ON public.sanction_extractions FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id) AND created_by = auth.uid());
CREATE POLICY extractions_update ON public.sanction_extractions FOR UPDATE TO authenticated USING (public.can_manage_records(organization_id)) WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY extractions_delete ON public.sanction_extractions FOR DELETE TO authenticated USING (public.has_org_role(organization_id, 'admin_empresa'::app_role));
CREATE TRIGGER sanction_extractions_updated_at BEFORE UPDATE ON public.sanction_extractions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_extractions_sancion ON public.sanction_extractions(sanction_id);
CREATE INDEX idx_extractions_org ON public.sanction_extractions(organization_id);

-- 2. PLAZOS
CREATE TABLE public.sanction_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  start_date date,
  end_date date,
  document_date date,
  calculation_basis text,
  day_type text NOT NULL DEFAULT 'naturales',
  source text NOT NULL DEFAULT 'calculo',
  status text NOT NULL DEFAULT 'Calculado',
  notes text,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sanction_id, deadline_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_deadlines TO authenticated;
GRANT ALL ON public.sanction_deadlines TO service_role;
ALTER TABLE public.sanction_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY deadlines_select ON public.sanction_deadlines FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY deadlines_insert ON public.sanction_deadlines FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY deadlines_update ON public.sanction_deadlines FOR UPDATE TO authenticated USING (public.can_manage_records(organization_id)) WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY deadlines_delete ON public.sanction_deadlines FOR DELETE TO authenticated USING (public.can_manage_records(organization_id));
CREATE TRIGGER sanction_deadlines_updated_at BEFORE UPDATE ON public.sanction_deadlines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_deadlines_sancion ON public.sanction_deadlines(sanction_id);

-- 3. ANALISIS DEL EXPEDIENTE
CREATE TABLE public.sanction_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Análisis completado',
  recommendation text,
  rationale text,
  next_step text,
  confidence_level text NOT NULL DEFAULT 'Medio',
  traffic_light text NOT NULL DEFAULT 'Gris',
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  coherence_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  procedure_review jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_review jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_analyses TO authenticated;
GRANT ALL ON public.sanction_analyses TO service_role;
ALTER TABLE public.sanction_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY analyses_select ON public.sanction_analyses FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY analyses_insert ON public.sanction_analyses FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY analyses_update ON public.sanction_analyses FOR UPDATE TO authenticated
  USING (public.can_manage_records(organization_id) OR public.has_org_role(organization_id, 'revisor_juridico'::app_role))
  WITH CHECK (public.can_manage_records(organization_id) OR public.has_org_role(organization_id, 'revisor_juridico'::app_role));
CREATE POLICY analyses_delete ON public.sanction_analyses FOR DELETE TO authenticated USING (public.has_org_role(organization_id, 'admin_empresa'::app_role));
CREATE TRIGGER sanction_analyses_updated_at BEFORE UPDATE ON public.sanction_analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_analyses_sancion ON public.sanction_analyses(sanction_id);

-- 4. FUENTES JURIDICAS (catalogo compartido, solo lectura)
CREATE TABLE public.legal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norm text NOT NULL,
  article text,
  section text,
  scope text,
  summary text,
  version_date date,
  source_name text,
  official_url text,
  consulted_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_sources TO authenticated;
GRANT ALL ON public.legal_sources TO service_role;
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_sources_select ON public.legal_sources FOR SELECT TO authenticated USING (true);
CREATE TRIGGER legal_sources_updated_at BEFORE UPDATE ON public.legal_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. BORRADORES
CREATE TABLE public.sanction_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'Alegaciones',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Borrador',
  current_version integer NOT NULL DEFAULT 1,
  legal_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_drafts TO authenticated;
GRANT ALL ON public.sanction_drafts TO service_role;
ALTER TABLE public.sanction_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY drafts_select ON public.sanction_drafts FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY drafts_insert ON public.sanction_drafts FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id) AND created_by = auth.uid());
CREATE POLICY drafts_update ON public.sanction_drafts FOR UPDATE TO authenticated
  USING (public.can_manage_records(organization_id) OR public.has_org_role(organization_id, 'revisor_juridico'::app_role))
  WITH CHECK (public.can_manage_records(organization_id) OR public.has_org_role(organization_id, 'revisor_juridico'::app_role));
CREATE POLICY drafts_delete ON public.sanction_drafts FOR DELETE TO authenticated USING (public.has_org_role(organization_id, 'admin_empresa'::app_role));
CREATE TRIGGER sanction_drafts_updated_at BEFORE UPDATE ON public.sanction_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_drafts_sancion ON public.sanction_drafts(sanction_id);

CREATE TABLE public.sanction_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  draft_id uuid NOT NULL REFERENCES public.sanction_drafts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  change_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, version)
);
GRANT SELECT, INSERT ON public.sanction_draft_versions TO authenticated;
GRANT ALL ON public.sanction_draft_versions TO service_role;
ALTER TABLE public.sanction_draft_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY draft_versions_select ON public.sanction_draft_versions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY draft_versions_insert ON public.sanction_draft_versions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY draft_versions_no_update ON public.sanction_draft_versions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY draft_versions_no_delete ON public.sanction_draft_versions FOR DELETE TO authenticated USING (false);
CREATE INDEX idx_draft_versions_draft ON public.sanction_draft_versions(draft_id);

-- 6. AVISOS INTERNOS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid REFERENCES public.sanctions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  severity text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (public.is_org_member(organization_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING (public.is_org_member(organization_id));
CREATE INDEX idx_notifications_org ON public.notifications(organization_id, created_at DESC);

-- 7. RESULTADOS (base para analitica de estrategias)
CREATE TABLE public.sanction_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL UNIQUE REFERENCES public.sanctions(id) ON DELETE CASCADE,
  sanction_category text,
  recommended_action text,
  action_taken text,
  arguments_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution text,
  favorable boolean,
  amount_paid numeric DEFAULT 0,
  amount_avoided numeric DEFAULT 0,
  discount_applied numeric DEFAULT 0,
  resolution_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_outcomes TO authenticated;
GRANT ALL ON public.sanction_outcomes TO service_role;
ALTER TABLE public.sanction_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcomes_select ON public.sanction_outcomes FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY outcomes_insert ON public.sanction_outcomes FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY outcomes_update ON public.sanction_outcomes FOR UPDATE TO authenticated USING (public.can_manage_records(organization_id)) WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY outcomes_delete ON public.sanction_outcomes FOR DELETE TO authenticated USING (public.has_org_role(organization_id, 'admin_empresa'::app_role));
CREATE TRIGGER sanction_outcomes_updated_at BEFORE UPDATE ON public.sanction_outcomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. ACCESOS A DOCUMENTOS (privacidad)
CREATE TABLE public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.sanction_documents(id) ON DELETE CASCADE,
  sanction_id uuid REFERENCES public.sanctions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.document_access_logs TO authenticated;
GRANT ALL ON public.document_access_logs TO service_role;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_access_select ON public.document_access_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY doc_access_insert ON public.document_access_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());
CREATE POLICY doc_access_no_update ON public.document_access_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY doc_access_no_delete ON public.document_access_logs FOR DELETE TO authenticated USING (false);
CREATE INDEX idx_doc_access_org ON public.document_access_logs(organization_id, created_at DESC);

-- 9. INTEGRACIONES FUTURAS (solo estructura)
CREATE TABLE public.integration_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'No configurada',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_endpoints TO authenticated;
GRANT ALL ON public.integration_endpoints TO service_role;
ALTER TABLE public.integration_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY integrations_select ON public.integration_endpoints FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY integrations_write ON public.integration_endpoints FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, 'admin_empresa'::app_role))
  WITH CHECK (public.has_org_role(organization_id, 'admin_empresa'::app_role));
CREATE TRIGGER integration_endpoints_updated_at BEFORE UPDATE ON public.integration_endpoints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. CAMPOS ADICIONALES EN SANCIONES
ALTER TABLE public.sanctions
  ADD COLUMN IF NOT EXISTS infraction_time text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS road text,
  ADD COLUMN IF NOT EXISTS kilometer_point text,
  ADD COLUMN IF NOT EXISTS municipality text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS legal_norm text,
  ADD COLUMN IF NOT EXISTS legal_article text,
  ADD COLUMN IF NOT EXISTS legal_section text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS reported_facts text,
  ADD COLUMN IF NOT EXISTS surcharge_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric,
  ADD COLUMN IF NOT EXISTS requires_driver_identification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_identification_deadline date,
  ADD COLUMN IF NOT EXISTS denouncing_agent text,
  ADD COLUMN IF NOT EXISTS evidence_mentioned text,
  ADD COLUMN IF NOT EXISTS complaint_date date,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS reception_date date,
  ADD COLUMN IF NOT EXISTS traffic_light text,
  ADD COLUMN IF NOT EXISTS analysis_status text;

-- 11. FUENTES JURIDICAS INICIALES
INSERT INTO public.legal_sources (norm, article, section, scope, summary, version_date, source_name, official_url, consulted_at) VALUES
('Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas', 'Artículo 30', 'Cómputo de plazos', 'Estatal', 'Reglas de cómputo de plazos por días hábiles y por meses en el procedimiento administrativo.', '2015-10-01', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565', CURRENT_DATE),
('Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas', 'Artículo 40', 'Notificación', 'Estatal', 'Obligación de notificar los actos administrativos y contenido mínimo de la notificación.', '2015-10-01', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565', CURRENT_DATE),
('Real Decreto Legislativo 6/2015, Ley sobre Tráfico, Circulación de Vehículos a Motor y Seguridad Vial', 'Artículo 94', 'Reducción del importe', 'Estatal', 'Reducción del 50 % del importe de la multa por pago dentro del plazo legalmente previsto.', '2015-10-30', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722', CURRENT_DATE),
('Real Decreto Legislativo 6/2015, Ley sobre Tráfico, Circulación de Vehículos a Motor y Seguridad Vial', 'Artículo 11', 'Deber de identificación del conductor', 'Estatal', 'Obligación del titular del vehículo de identificar al conductor responsable de la infracción.', '2015-10-30', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722', CURRENT_DATE),
('Real Decreto Legislativo 6/2015, Ley sobre Tráfico, Circulación de Vehículos a Motor y Seguridad Vial', 'Artículo 112', 'Prescripción y caducidad', 'Estatal', 'Plazos de prescripción de infracciones y sanciones y caducidad del procedimiento sancionador.', '2015-10-30', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722', CURRENT_DATE),
('Ley 16/1987, de 30 de julio, de Ordenación de los Transportes Terrestres', 'Artículo 140', 'Infracciones muy graves', 'Estatal', 'Catálogo de infracciones muy graves en materia de transporte terrestre de mercancías.', '1987-07-30', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-1987-17803', CURRENT_DATE),
('Ley 16/1987, de 30 de julio, de Ordenación de los Transportes Terrestres', 'Artículo 141', 'Infracciones graves', 'Estatal', 'Catálogo de infracciones graves en materia de transporte terrestre de mercancías.', '1987-07-30', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-1987-17803', CURRENT_DATE),
('Reglamento (CE) n.º 561/2006, tiempos de conducción y descanso', 'Artículo 6', 'Tiempos de conducción', 'Unión Europea', 'Límites de tiempo de conducción diario, semanal y bisemanal.', '2006-03-15', 'Diario Oficial de la Unión Europea', 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32006R0561', CURRENT_DATE),
('Reglamento (CE) n.º 561/2006, tiempos de conducción y descanso', 'Artículo 8', 'Tiempos de descanso', 'Unión Europea', 'Descansos diarios y semanales obligatorios de los conductores.', '2006-03-15', 'Diario Oficial de la Unión Europea', 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32006R0561', CURRENT_DATE),
('Reglamento (UE) n.º 165/2014, relativo a los tacógrafos en el transporte por carretera', 'Artículo 34', 'Utilización de tarjetas y hojas de registro', 'Unión Europea', 'Obligaciones de uso del tacógrafo y conservación de los registros.', '2014-02-04', 'Diario Oficial de la Unión Europea', 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32014R0165', CURRENT_DATE);