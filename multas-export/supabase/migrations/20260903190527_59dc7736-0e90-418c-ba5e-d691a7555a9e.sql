DROP POLICY IF EXISTS integrations_select ON public.integration_endpoints;
CREATE POLICY integrations_select ON public.integration_endpoints
FOR SELECT TO authenticated
USING (public.has_org_role(organization_id, 'admin_empresa'));

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
FOR DELETE TO authenticated
USING (
  public.is_org_member(organization_id)
  AND (
    user_id = auth.uid()
    OR public.has_org_role(organization_id, 'admin_empresa')
    OR public.can_manage_records(organization_id)
  )
);