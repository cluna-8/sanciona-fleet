-- scripts/db/crear-superadmin.sql
-- Da de alta un superadministrador de plataforma en public.platform_admins.
-- Sustituye al INSERT por UUID fijo que vivía en la migración 20260901191809
-- (ver RS-3 en SPEC.md §5): los superadmins se gestionan por persona, no
-- versionados en el esquema.
--
-- Busca por EMAIL (no por UUID), así sirve en cualquier proyecto Supabase sin
-- conocer el user_id de antemano. Falla explícitamente si el usuario no existe.
--
-- Uso con psql (variable :admin_email):
--   psql "$SUPABASE_DB_URL" -v admin_email='admin@tudominio.es' -f scripts/db/crear-superadmin.sql
--
-- Uso desde el SQL Editor de Supabase: reemplaza :admin_email por el email
-- entre comillas simples en las dos marcas, y ejecuta. Requiere service_role.
--
-- Para QUITAR un superadmin: DELETE FROM public.platform_admins WHERE user_id =
--   (SELECT id FROM auth.users WHERE lower(email) = lower('<email>'));

DO $$
DECLARE
  uid uuid;
  correo text := lower(:'admin_email');
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = correo;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario auth.users con email = %', correo;
  END IF;

  INSERT INTO public.platform_admins (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Superadmin asegurado: % (user_id %)', correo, uid;
END $$;