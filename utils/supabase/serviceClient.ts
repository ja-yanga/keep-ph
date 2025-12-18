import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role privileges
 * This client has admin access to bypass RLS policies and access auth data
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  ) as unknown as SupabaseClient;
}
