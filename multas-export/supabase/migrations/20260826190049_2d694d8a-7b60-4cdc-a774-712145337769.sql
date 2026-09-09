-- Harden demo-org RPC: never grant admin, always lowest-privilege role
CREATE OR REPLACE FUNCTION public.join_demo_organization()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE demo_id uuid := '11111111-1111-4111-8111-111111111111';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (demo_id, auth.uid(), 'revisor_juridico', 'activo')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'activo'
  WHERE public.organization_members.role IS NOT NULL;
  RETURN demo_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.ensure_active_organization()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_id uuid := '11111111-1111-4111-8111-111111111111';
  existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT m.organization_id INTO existing
  FROM public.organization_members m
  WHERE m.user_id = auth.uid() AND m.status = 'activo'
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (demo_id, auth.uid(), 'revisor_juridico', 'activo')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'activo'
  RETURNING organization_id INTO existing;

  RETURN existing;
END; $function$;

-- Demote any pre-existing elevated members of the shared demo organization
UPDATE public.organization_members
SET role = 'revisor_juridico'
WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  AND role <> 'revisor_juridico';

-- Reduce SECURITY DEFINER surface: only the two RPCs the app calls stay callable
REVOKE ALL ON FUNCTION public.is_demo_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_org_with(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_records(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_active_organization() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_demo_organization() FROM PUBLIC, anon;

-- Explicit, fail-closed policies for sanction sub-tables
DROP POLICY IF EXISTS actions_no_update ON public.sanction_actions;
DROP POLICY IF EXISTS actions_no_delete ON public.sanction_actions;
CREATE POLICY actions_no_update ON public.sanction_actions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY actions_no_delete ON public.sanction_actions FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS docs_no_update ON public.sanction_documents;
DROP POLICY IF EXISTS docs_delete ON public.sanction_documents;
CREATE POLICY docs_no_update ON public.sanction_documents FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY docs_delete ON public.sanction_documents FOR DELETE TO authenticated USING (public.can_manage_records(organization_id));

-- Only managers/admins may modify sanctions
DROP POLICY IF EXISTS sanctions_update ON public.sanctions;
CREATE POLICY sanctions_update ON public.sanctions FOR UPDATE TO authenticated
  USING (public.can_manage_records(organization_id))
  WITH CHECK (public.can_manage_records(organization_id));