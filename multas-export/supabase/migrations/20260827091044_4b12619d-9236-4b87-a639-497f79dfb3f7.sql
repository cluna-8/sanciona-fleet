-- Organizations: track creator to secure bootstrap membership
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS members_insert ON public.organization_members;
CREATE POLICY members_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(organization_id, 'admin_empresa'::app_role)
    OR (
      user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = organization_members.organization_id
      )
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_members.organization_id
          AND o.created_by = auth.uid()
      )
    )
  );

-- Notifications
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_records(organization_id));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (public.can_manage_records(organization_id) OR user_id = auth.uid())
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (public.can_manage_records(organization_id) OR user_id = auth.uid())
  );

-- Sanction extractions
DROP POLICY IF EXISTS extractions_insert ON public.sanction_extractions;
CREATE POLICY extractions_insert ON public.sanction_extractions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.can_manage_records(organization_id)
    AND created_by = auth.uid()
    AND public.sanction_belongs_to_org(sanction_id, organization_id)
  );

DROP POLICY IF EXISTS extractions_update ON public.sanction_extractions;
CREATE POLICY extractions_update ON public.sanction_extractions
  FOR UPDATE TO authenticated
  USING (public.can_manage_records(organization_id))
  WITH CHECK (
    public.can_manage_records(organization_id)
    AND public.sanction_belongs_to_org(sanction_id, organization_id)
  );