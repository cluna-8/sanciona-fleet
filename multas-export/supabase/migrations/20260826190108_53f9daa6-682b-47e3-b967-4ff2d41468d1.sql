-- Restore EXECUTE for the helper used inside profiles RLS policies (required for policy evaluation)
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated;