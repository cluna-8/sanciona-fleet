-- 1) [RS-3] Eliminado el INSERT que asignaba cuentas personales reales
--    como admin_empresa de la org demo. Esos emails y esa asignación no
--    deben vivir en una migración versionada: la membresía se gestiona por
--    la app, no hardcodeada por email. El rol inicial de quien entra a la
--    demo lo decide ensure_active_organization().

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