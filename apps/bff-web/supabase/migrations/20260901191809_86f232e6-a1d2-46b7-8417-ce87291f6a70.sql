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

-- [RS-3] Eliminado el INSERT de user_id fijos (UUIDs personales de cuentas
-- reales del proyecto Lovable). En un Supabase nuevo esos user_id no existen
-- y la FK a auth.users rompería la migración. Los superadministradores de
-- plataforma se gestionan con el script parametrizado
-- scripts/db/crear-superadmin.sql (exec por service_role), no desde aquí.