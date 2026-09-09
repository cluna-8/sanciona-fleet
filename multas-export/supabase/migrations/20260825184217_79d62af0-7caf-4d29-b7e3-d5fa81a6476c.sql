
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_records(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_org_with(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_demo_organization() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_records(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_demo_organization() TO authenticated;
