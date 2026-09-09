-- =====================================================================
-- EXPORT DE DATOS — proyecto Supabase yaqnvsijescamfjfncus (Control de Multas)
-- =====================================================================
-- Pégalo en Lovable → Más → Cloud → SQL editor y ejecútalo.
-- Es SOLO LECTURA: no modifica ni borra nada.
-- Devuelve UNA celda con todo el contenido de las 22 tablas en JSON.
-- Copia el resultado y guárdalo como  multas-export-datos.json
--
-- Si el resultado se trunca en pantalla, ejecuta el BLOQUE B (más abajo),
-- que lo parte en tablas sueltas.
-- =====================================================================

-- ---------- BLOQUE A: todo en un solo JSON ----------
SELECT jsonb_pretty(jsonb_build_object(
  'exportado_el',              now(),
  'organizations',             (SELECT jsonb_agg(t) FROM public.organizations t),
  'organization_members',      (SELECT jsonb_agg(t) FROM public.organization_members t),
  'organization_invitations',  (SELECT jsonb_agg(t) FROM public.organization_invitations t),
  'profiles',                  (SELECT jsonb_agg(t) FROM public.profiles t),
  'platform_admins',           (SELECT jsonb_agg(t) FROM public.platform_admins t),
  'vehicles',                  (SELECT jsonb_agg(t) FROM public.vehicles t),
  'drivers',                   (SELECT jsonb_agg(t) FROM public.drivers t),
  'sanctions',                 (SELECT jsonb_agg(t) FROM public.sanctions t),
  'sanction_documents',        (SELECT jsonb_agg(t) FROM public.sanction_documents t),
  'sanction_extractions',      (SELECT jsonb_agg(t) FROM public.sanction_extractions t),
  'sanction_deadlines',        (SELECT jsonb_agg(t) FROM public.sanction_deadlines t),
  'sanction_analyses',         (SELECT jsonb_agg(t) FROM public.sanction_analyses t),
  'sanction_drafts',           (SELECT jsonb_agg(t) FROM public.sanction_drafts t),
  'sanction_draft_versions',   (SELECT jsonb_agg(t) FROM public.sanction_draft_versions t),
  'sanction_actions',          (SELECT jsonb_agg(t) FROM public.sanction_actions t),
  'sanction_comments',         (SELECT jsonb_agg(t) FROM public.sanction_comments t),
  'sanction_outcomes',         (SELECT jsonb_agg(t) FROM public.sanction_outcomes t),
  'notifications',             (SELECT jsonb_agg(t) FROM public.notifications t),
  'activity_logs',             (SELECT jsonb_agg(t) FROM public.activity_logs t),
  'document_access_logs',      (SELECT jsonb_agg(t) FROM public.document_access_logs t),
  'legal_sources',             (SELECT jsonb_agg(t) FROM public.legal_sources t),
  'integration_endpoints',     (SELECT jsonb_agg(t) FROM public.integration_endpoints t)
)) AS export_completo;


-- ---------- BLOQUE B: una tabla por ejecución (si A se trunca) ----------
-- Cambia el nombre de la tabla y vuelve a ejecutar:
-- SELECT jsonb_pretty(jsonb_agg(t)) FROM public.sanctions t;


-- ---------- BLOQUE C: usuarios de auth (opcional) ----------
-- Los 6 usuarios reales viven en auth.users, no en public.
-- Esto devuelve solo lo necesario para recrearlos, SIN los hashes de contraseña:
-- SELECT jsonb_pretty(jsonb_agg(jsonb_build_object(
--   'id', id, 'email', email, 'created_at', created_at,
--   'email_confirmed_at', email_confirmed_at, 'last_sign_in_at', last_sign_in_at,
--   'raw_user_meta_data', raw_user_meta_data
-- ))) FROM auth.users;


-- ---------- BLOQUE D: inventario de ficheros en Storage ----------
-- SELECT jsonb_pretty(jsonb_agg(jsonb_build_object(
--   'name', name, 'bucket_id', bucket_id, 'created_at', created_at,
--   'metadata', metadata
-- ))) FROM storage.objects WHERE bucket_id = 'sanction-documents';
