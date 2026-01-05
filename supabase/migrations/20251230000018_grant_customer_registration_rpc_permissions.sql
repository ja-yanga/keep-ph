-- Grant execute permissions for customer mailroom registration RPC functions
-- This migration ensures PostgREST can access these functions via the API

GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_assigned_lockers(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_assigned_lockers(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_mailbox_items_by_registrations(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailbox_items_by_registrations(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_user_mailroom_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_mailroom_subscription(UUID) TO anon;

