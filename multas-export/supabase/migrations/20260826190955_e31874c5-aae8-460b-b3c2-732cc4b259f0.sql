CREATE OR REPLACE FUNCTION public.sanction_belongs_to_org(_sanction uuid, _org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _sanction IS NULL OR EXISTS (
    SELECT 1 FROM public.sanctions s
    WHERE s.id = _sanction AND s.organization_id = _org
  );
$$;

REVOKE EXECUTE ON FUNCTION public.sanction_belongs_to_org(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sanction_belongs_to_org(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS extractions_insert ON public.sanction_extractions;
CREATE POLICY extractions_insert ON public.sanction_extractions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_org_member(organization_id)
  AND created_by = auth.uid()
  AND public.sanction_belongs_to_org(sanction_id, organization_id)
);

DROP POLICY IF EXISTS extractions_update ON public.sanction_extractions;
CREATE POLICY extractions_update ON public.sanction_extractions
FOR UPDATE TO authenticated
USING (public.is_org_member(organization_id))
WITH CHECK (
  public.is_org_member(organization_id)
  AND public.sanction_belongs_to_org(sanction_id, organization_id)
);