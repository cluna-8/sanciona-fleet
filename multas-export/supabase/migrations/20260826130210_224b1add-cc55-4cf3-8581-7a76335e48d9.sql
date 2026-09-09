-- 1. Demo organization: join as read-only reviewer instead of admin
CREATE OR REPLACE FUNCTION public.join_demo_organization()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE demo_id uuid := '11111111-1111-4111-8111-111111111111';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (demo_id, auth.uid(), 'revisor_juridico', 'activo')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN demo_id;
END; $$;

-- Downgrade existing demo admins (except nobody should be admin there)
UPDATE public.organization_members
SET role = 'revisor_juridico'
WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  AND role <> 'revisor_juridico';

-- Helper: is this the shared demo organization?
CREATE OR REPLACE FUNCTION public.is_demo_org(_org uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT _org = '11111111-1111-4111-8111-111111111111'::uuid $$;

-- 2. Protect the demo org from deletion and member tampering
DROP POLICY IF EXISTS org_delete ON public.organizations;
CREATE POLICY org_delete ON public.organizations
FOR DELETE TO authenticated
USING (has_org_role(id, 'admin_empresa'::app_role) AND NOT is_demo_org(id));

DROP POLICY IF EXISTS members_update ON public.organization_members;
CREATE POLICY members_update ON public.organization_members
FOR UPDATE TO authenticated
USING (has_org_role(organization_id, 'admin_empresa'::app_role) AND NOT is_demo_org(organization_id))
WITH CHECK (has_org_role(organization_id, 'admin_empresa'::app_role) AND NOT is_demo_org(organization_id));

DROP POLICY IF EXISTS members_delete ON public.organization_members;
CREATE POLICY members_delete ON public.organization_members
FOR DELETE TO authenticated
USING (
  (has_org_role(organization_id, 'admin_empresa'::app_role) AND NOT is_demo_org(organization_id))
  OR (is_demo_org(organization_id) AND user_id = auth.uid())
);

-- Demo members must not see each other's real profiles
CREATE OR REPLACE FUNCTION public.shares_org_with(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members a
    JOIN public.organization_members b ON a.organization_id = b.organization_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user
      AND a.organization_id <> '11111111-1111-4111-8111-111111111111'::uuid);
$$;

-- 3. Only managers may update sanctions
DROP POLICY IF EXISTS sanctions_update ON public.sanctions;
CREATE POLICY sanctions_update ON public.sanctions
FOR UPDATE TO authenticated
USING (can_manage_records(organization_id))
WITH CHECK (can_manage_records(organization_id));

-- 4. Explicit immutability for audit trail / documents
DROP POLICY IF EXISTS actions_no_update ON public.sanction_actions;
CREATE POLICY actions_no_update ON public.sanction_actions
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS actions_no_delete ON public.sanction_actions;
CREATE POLICY actions_no_delete ON public.sanction_actions
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS docs_no_update ON public.sanction_documents;
CREATE POLICY docs_no_update ON public.sanction_documents
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- 5. Restrict execution of internal functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_demo_organization() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_records(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_org_with(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.join_demo_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_records(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_org(uuid) TO authenticated;