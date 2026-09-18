-- 1) [RS-3] Espejo de Lovable: los emails personales reales que aquí figuraban
--    se redactan antes de publicar el repo. Lógica original conservada.
INSERT INTO public.organization_members (organization_id, user_id, role, status)
SELECT '11111111-1111-4111-8111-111111111111'::uuid, u.id, 'admin_empresa'::app_role, 'activo'::member_status
FROM auth.users u
WHERE u.email IN ('<cuenta-personal-1@redactado>','<cuenta-personal-2@redactado>')
ON CONFLICT (organization_id, user_id)
DO UPDATE SET role = 'admin_empresa'::app_role, status = 'activo'::member_status;

-- 2) Función de arranque: garantiza que el usuario autenticado tenga una empresa activa
CREATE OR REPLACE FUNCTION public.ensure_active_organization()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (demo_id, auth.uid(), 'revisor_juridico', 'activo')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'activo'
  RETURNING organization_id INTO existing;

  RETURN existing;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_active_organization() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_active_organization() TO authenticated;