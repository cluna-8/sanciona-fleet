-- Log append-only de operaciones con IA por organización (A-3b, ADR 0003).
--
-- Dos consumos:
-- 1. `comprobarCuotaDiariaIA` cuenta las filas del día en curso (Europe/Madrid)
--    para topar el gasto por organización antes de gastar tokens.
-- 2. `registrarUsoIA` escribe una fila por llamada exitosa al modelo, con los
--    tokens que informa el proveedor — base del gasto por organización cuando
--    la puerta de precios (ADR 0004 D-4/D-5) fije límites por plan.
--
-- Append-only deliberado: sin GRANT UPDATE/DELETE, sin policies de modificación
-- y sin `updated_at` (y por tanto sin trigger set_updated_at) — un log de gasto
-- que se pueda reescribir no es un log de gasto.
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('extraccion','analisis','borrador')),
  model text,
  tokens_entrada integer,
  tokens_salida integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_logs_org_dia_idx
  ON public.ai_usage_logs (organization_id, created_at);

GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Solo se registra el propio uso, de un miembro de la organización.
CREATE POLICY "ai_usage_insert" ON public.ai_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());

-- Cualquier miembro ve el gasto de su organización; los admins de plataforma, todos.
CREATE POLICY "ai_usage_select" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_platform_admin());