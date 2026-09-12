CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role app_role NOT NULL DEFAULT 'gestor_sanciones',
  status text NOT NULL DEFAULT 'pendiente',
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organization_invitations_org_email_key
  ON public.organization_invitations (organization_id, lower(email));
CREATE INDEX organization_invitations_email_idx
  ON public.organization_invitations (lower(email)) WHERE status = 'pendiente';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id, 'admin_empresa') OR public.is_platform_admin());

CREATE POLICY "invitations_insert" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, 'admin_empresa') AND invited_by = auth.uid());

CREATE POLICY "invitations_update" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, 'admin_empresa'))
  WITH CHECK (public.has_org_role(organization_id, 'admin_empresa'));

CREATE POLICY "invitations_delete" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, 'admin_empresa'));

CREATE TRIGGER organization_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  FOR inv IN
    SELECT * FROM public.organization_invitations
    WHERE status = 'pendiente' AND lower(email) = lower(COALESCE(NEW.email, ''))
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (inv.organization_id, NEW.id, inv.role, 'activo')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.organization_invitations
    SET status = 'aceptada', accepted_at = now()
    WHERE id = inv.id;

    IF COALESCE(NULLIF(TRIM(inv.full_name), ''), '') <> '' THEN
      UPDATE public.profiles SET full_name = inv.full_name
      WHERE id = NEW.id AND COALESCE(NULLIF(TRIM(full_name), ''), '') = '';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;