DO $$
DECLARE r RECORD; nueva uuid; nombre text;
BEGIN
  FOR r IN
    SELECT u.id AS user_id, u.email, p.full_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
  LOOP
    DELETE FROM public.organization_members
    WHERE user_id = r.user_id
      AND organization_id = '11111111-1111-4111-8111-111111111111'::uuid;

    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = r.user_id AND m.status = 'activo'
    ) THEN
      nombre := COALESCE(NULLIF(TRIM(r.full_name), ''), split_part(COALESCE(r.email,''), '@', 1), 'Mi empresa');
      INSERT INTO public.organizations (name, created_by) VALUES (nombre, r.user_id)
      RETURNING id INTO nueva;
      INSERT INTO public.organization_members (organization_id, user_id, role, status)
      VALUES (nueva, r.user_id, 'admin_empresa', 'activo');
    END IF;
  END LOOP;
END $$;