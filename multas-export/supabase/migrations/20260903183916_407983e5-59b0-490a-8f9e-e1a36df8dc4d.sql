CREATE OR REPLACE FUNCTION public.ensure_active_organization()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
  nombre text;
  nueva uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT m.organization_id INTO existing
  FROM public.organization_members m
  WHERE m.user_id = auth.uid() AND m.status = 'activo'
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF existing IS NOT NULL THEN RETURN existing; END IF;

  SELECT COALESCE(NULLIF(TRIM(p.full_name), ''), split_part(COALESCE(p.email, ''), '@', 1), 'Mi empresa')
  INTO nombre
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.organizations (name, created_by)
  VALUES (COALESCE(nombre, 'Mi empresa'), auth.uid())
  RETURNING id INTO nueva;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (nueva, auth.uid(), 'admin_empresa', 'activo');

  RETURN nueva;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_active_organization() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_active_organization() TO authenticated;

DROP FUNCTION IF EXISTS public.join_demo_organization();