
CREATE TYPE public.app_role AS ENUM ('admin_empresa','gestor_sanciones','revisor_juridico');
CREATE TYPE public.member_status AS ENUM ('activo','invitado','inactivo');
CREATE TYPE public.sanction_status AS ENUM (
  'Nueva','Pendiente de documentación','Pendiente de revisión','Pagar con descuento',
  'Preparar alegaciones','Alegaciones presentadas','Recurso presentado',
  'Resuelta favorablemente','Resuelta desfavorablemente','Pagada','Archivada'
);
CREATE TYPE public.sanction_priority AS ENUM ('Baja','Media','Alta','Crítica');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cif text,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'gestor_sanciones',
  status public.member_status NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'activo');
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
      AND m.status = 'activo' AND m.role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_records(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
      AND m.status = 'activo' AND m.role IN ('admin_empresa','gestor_sanciones'));
$$;

CREATE OR REPLACE FUNCTION public.shares_org_with(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members a
    JOIN public.organization_members b ON a.organization_id = b.organization_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user);
$$;

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  internal_code text,
  brand text,
  model text,
  vehicle_type text,
  status text NOT NULL DEFAULT 'Activo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  identification_number text,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'Activo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reference_number text NOT NULL,
  sanctioning_authority text,
  sanction_category text,
  description text,
  violation_date date,
  notification_date date,
  payment_deadline date,
  appeal_deadline date,
  original_amount numeric(12,2) DEFAULT 0,
  discounted_amount numeric(12,2),
  points integer DEFAULT 0,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status public.sanction_status NOT NULL DEFAULT 'Nueva',
  recommended_action text,
  priority public.sanction_priority NOT NULL DEFAULT 'Media',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sanction_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  document_type text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sanction_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  description text,
  action_date date NOT NULL DEFAULT current_date,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sanction_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanction_id uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  action text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanction_comments TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.organizations, public.profiles, public.organization_members,
  public.vehicles, public.drivers, public.sanctions, public.sanction_documents,
  public.sanction_actions, public.sanction_comments, public.activity_logs TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanction_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanction_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_role(id,'admin_empresa')) WITH CHECK (public.has_org_role(id,'admin_empresa'));
CREATE POLICY "org_delete" ON public.organizations FOR DELETE TO authenticated USING (public.has_org_role(id,'admin_empresa'));

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.shares_org_with(id));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY "members_insert" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id,'admin_empresa')
    OR NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_members.organization_id));
CREATE POLICY "members_update" ON public.organization_members FOR UPDATE TO authenticated USING (public.has_org_role(organization_id,'admin_empresa')) WITH CHECK (public.has_org_role(organization_id,'admin_empresa'));
CREATE POLICY "members_delete" ON public.organization_members FOR DELETE TO authenticated USING (public.has_org_role(organization_id,'admin_empresa'));

CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "vehicles_insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY "vehicles_update" ON public.vehicles FOR UPDATE TO authenticated USING (public.can_manage_records(organization_id)) WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY "vehicles_delete" ON public.vehicles FOR DELETE TO authenticated USING (public.can_manage_records(organization_id));

CREATE POLICY "drivers_select" ON public.drivers FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "drivers_insert" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY "drivers_update" ON public.drivers FOR UPDATE TO authenticated USING (public.can_manage_records(organization_id)) WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY "drivers_delete" ON public.drivers FOR DELETE TO authenticated USING (public.can_manage_records(organization_id));

CREATE POLICY "sanctions_select" ON public.sanctions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "sanctions_insert" ON public.sanctions FOR INSERT TO authenticated WITH CHECK (public.can_manage_records(organization_id));
CREATE POLICY "sanctions_update" ON public.sanctions FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "sanctions_delete" ON public.sanctions FOR DELETE TO authenticated USING (public.has_org_role(organization_id,'admin_empresa'));

CREATE POLICY "docs_select" ON public.sanction_documents FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "docs_insert" ON public.sanction_documents FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND uploaded_by = auth.uid());
CREATE POLICY "docs_delete" ON public.sanction_documents FOR DELETE TO authenticated USING (public.can_manage_records(organization_id));

CREATE POLICY "actions_select" ON public.sanction_actions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "actions_insert" ON public.sanction_actions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND performed_by = auth.uid());

CREATE POLICY "comments_select" ON public.sanction_comments FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "comments_insert" ON public.sanction_comments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "comments_delete" ON public.sanction_comments FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_org_role(organization_id,'admin_empresa'));

CREATE POLICY "logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER sanctions_updated_at BEFORE UPDATE ON public.sanctions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "sanction_docs_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sanction-documents' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "sanction_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sanction-documents' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "sanction_docs_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sanction-documents' AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE OR REPLACE FUNCTION public.join_demo_organization()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE demo_id uuid := '11111111-1111-4111-8111-111111111111';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (demo_id, auth.uid(), 'admin_empresa', 'activo')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN demo_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.join_demo_organization() TO authenticated;

INSERT INTO public.organizations (id, name, cif, address, contact_name, contact_email, contact_phone)
VALUES ('11111111-1111-4111-8111-111111111111','Transportes Levante Demo, S.L.','B98765432','Polígono Industrial Fuente del Jarro, Nave 12, 46988 Paterna (Valencia)','Departamento de Flota','flota@levantedemo.example','961234567');

INSERT INTO public.vehicles (id, organization_id, registration_number, internal_code, brand, model, vehicle_type, status) VALUES
('22222222-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','1234 KLM','TR-01','Volvo','FH 460','Tractora','Activo'),
('22222222-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','5678 BCD','TR-02','Scania','R 450','Tractora','Activo'),
('22222222-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','9012 FGH','TR-03','MAN','TGX 18.500','Tractora','Activo'),
('22222222-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','3456 JKL','RG-01','Schmitz','SCS 24','Semirremolque','Activo'),
('22222222-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','7890 MNP','RG-02','Krone','Profi Liner','Semirremolque','Taller'),
('22222222-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','2468 QRS','RP-01','Mercedes-Benz','Sprinter 316','Furgoneta','Activo'),
('22222222-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111','1357 TVW','RP-02','Iveco','Daily 35S18','Furgoneta','Activo'),
('22222222-0000-4000-8000-000000000008','11111111-1111-4111-8111-111111111111','8642 XYZ','TR-04','Renault','T High 520','Tractora','Baja');

INSERT INTO public.drivers (id, organization_id, full_name, identification_number, email, phone, status) VALUES
('33333333-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Andrés Molina Ferrer','00000001A','andres.molina@levantedemo.example','600000001','Activo'),
('33333333-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Beatriz Sanchis Roig','00000002B','beatriz.sanchis@levantedemo.example','600000002','Activo'),
('33333333-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Carlos Peiró Blasco','00000003C','carlos.peiro@levantedemo.example','600000003','Activo'),
('33333333-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Diana Ortiz Navarro','00000004D','diana.ortiz@levantedemo.example','600000004','Activo'),
('33333333-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','Emilio Ruiz Català','00000005E','emilio.ruiz@levantedemo.example','600000005','Activo'),
('33333333-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','Fátima Gil Esteve','00000006F','fatima.gil@levantedemo.example','600000006','Activo'),
('33333333-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111','Gonzalo Marí Tomás','00000007G','gonzalo.mari@levantedemo.example','600000007','Baja temporal'),
('33333333-0000-4000-8000-000000000008','11111111-1111-4111-8111-111111111111','Helena Bosch Lluch','00000008H','helena.bosch@levantedemo.example','600000008','Activo'),
('33333333-0000-4000-8000-000000000009','11111111-1111-4111-8111-111111111111','Iván Correa Puig','00000009I','ivan.correa@levantedemo.example','600000009','Activo'),
('33333333-0000-4000-8000-000000000010','11111111-1111-4111-8111-111111111111','Julia Ferrandis Mas','00000010J','julia.ferrandis@levantedemo.example','600000010','Activo');

INSERT INTO public.sanctions (organization_id, reference_number, sanctioning_authority, sanction_category, description, violation_date, notification_date, payment_deadline, appeal_deadline, original_amount, discounted_amount, points, vehicle_id, driver_id, status, recommended_action, priority, notes) VALUES
('11111111-1111-4111-8111-111111111111','EXP-2026-0001','DGT','Exceso de velocidad','Circular a 105 km/h en tramo limitado a 90 km/h en la A-7.', current_date - 21, current_date - 12, current_date + 2, current_date + 9, 300.00, 150.00, 2,'22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Pagar con descuento','Abonar con reducción del 50%','Alta','Radar fijo, prueba gráfica disponible.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0002','Ministerio de Transportes','Tiempos de conducción y descanso','Superación del tiempo máximo de conducción diaria en 1h20.', current_date - 30, current_date - 18, current_date - 2, current_date + 3, 2001.00, 1000.50, 0,'22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000002','Preparar alegaciones','Revisar descargas de tacógrafo antes de alegar','Crítica','Posible error de registro en la tarjeta del conductor.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0003','Ayuntamiento de Valencia','Estacionamiento','Estacionamiento en carga y descarga fuera del horario autorizado.', current_date - 15, current_date - 8, current_date + 12, current_date + 19, 200.00, 100.00, 0,'22222222-0000-4000-8000-000000000006','33333333-0000-4000-8000-000000000003','Nueva',NULL,'Baja','Zona con señalización poco visible.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0004','Guardia Civil de Tráfico','Exceso de peso','Exceso de masa máxima autorizada del 12% en báscula móvil.', current_date - 45, current_date - 33, current_date + 5, current_date + 12, 1201.00, 600.50, 0,'22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000004','Pendiente de documentación','Solicitar ticket de báscula del cargador','Alta','Falta albarán de carga del cliente.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0005','DGT','Documentación','Ausencia de certificado ITV vigente durante inspección.', current_date - 60, current_date - 50, current_date - 20, current_date - 13, 401.00, 200.50, 0,'22222222-0000-4000-8000-000000000005',NULL,'Alegaciones presentadas','Aportar justificante de cita previa de ITV','Media','Alegaciones remitidas por sede electrónica.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0006','Ministerio de Transportes','Mercancías peligrosas','Deficiencias en el etiquetado ADR de la carga.', current_date - 90, current_date - 78, current_date - 48, current_date - 41, 4001.00, 2000.50, 0,'22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','Recurso presentado','Esperar resolución del recurso de alzada','Crítica','Recurso de alzada presentado en plazo.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0007','Ayuntamiento de Alicante','Medioambiente','Acceso a zona de bajas emisiones sin distintivo.', current_date - 25, current_date - 14, current_date + 6, current_date + 13, 200.00, 100.00, 0,'22222222-0000-4000-8000-000000000007','33333333-0000-4000-8000-000000000006','Pendiente de revisión','Valorar viabilidad de alegaciones','Media','Vehículo con distintivo C no registrado en el padrón.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0008','DGT','Exceso de velocidad','Circular a 98 km/h en tramo limitado a 80 km/h.', current_date - 120, current_date - 110, current_date - 80, current_date - 73, 300.00, 150.00, 2,'22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000008','Pagada','Expediente cerrado tras el pago','Baja','Pagado con reducción.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0009','Ministerio de Transportes','Tiempos de conducción y descanso','Descanso semanal reducido no compensado.', current_date - 150, current_date - 140, current_date - 110, current_date - 103, 1001.00, 500.50, 0,'22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000009','Resuelta favorablemente','Sin actuación adicional','Baja','Estimadas las alegaciones, sanción anulada.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0010','Guardia Civil de Tráfico','Tacógrafo','Manipulación no acreditada del registro del tacógrafo.', current_date - 200, current_date - 190, current_date - 160, current_date - 153, 4001.00, 2000.50, 0,'22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000010','Resuelta desfavorablemente','Abonar sanción firme','Media','Desestimado el recurso.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0011','Ayuntamiento de Castellón','Estacionamiento','Parada en doble fila en vía urbana.', current_date - 300, current_date - 290, current_date - 260, current_date - 253, 90.00, 45.00, 0,'22222222-0000-4000-8000-000000000006','33333333-0000-4000-8000-000000000003','Archivada','Expediente archivado','Baja','Archivado por caducidad del procedimiento.'),
('11111111-1111-4111-8111-111111111111','EXP-2026-0012','DGT','Documentación','Conductor sin CAP en vigor durante el control.', current_date - 5, current_date - 1, current_date + 19, current_date + 26, 601.00, 300.50, 0,'22222222-0000-4000-8000-000000000008','33333333-0000-4000-8000-000000000007','Nueva',NULL,'Alta','Pendiente de comprobar renovación del CAP.');
