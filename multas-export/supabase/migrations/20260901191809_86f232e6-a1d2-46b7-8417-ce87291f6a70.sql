CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select_self ON public.platform_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.platform_admins p WHERE p.user_id = auth.uid()) $$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- [RS-3] Espejo de Lovable: los user_id personales fijos se redactan antes
-- de publicar el repo. En apps/bff-web este INSERT se eliminó y los
-- superadmins se gestionan con scripts/db/crear-superadmin.sql.
INSERT INTO public.platform_admins (user_id) VALUES
  ('<uuid-personal-1-redactado>'),
  ('<uuid-personal-2-redactado>')
ON CONFLICT DO NOTHING;