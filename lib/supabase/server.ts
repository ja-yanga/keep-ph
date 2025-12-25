import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

export async function createClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const authHeader = headerList.get("Authorization");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Single source of truth for getting the authenticated user.
 *
 * @param isAPI - If true, throws an error for API routes (returns 401 JSON).
 *                If false (default), redirects to /signin for Server Components.
 * @returns { user, supabase } if authenticated
 * @throws Error if isAPI=true and user is not authenticated
 */
export const getAuthenticatedUser = cache(async (isAPI: boolean = false) => {
  // For API routes, explicitly require Authorization header
  if (isAPI) {
    const headerList = await headers();
    const authHeader = headerList.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("API route called without Authorization header");
      throw new Error(
        "Unauthorized. Please provide a valid Bearer token in the Authorization header.",
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Explicitly check for both error and missing user
  if (error || !user) {
    if (isAPI) {
      // Log for debugging
      console.error("Authentication failed:", {
        error: error?.message || "No error object",
        hasUser: !!user,
        errorCode: error?.status,
      });
      throw new Error(
        "Unauthorized. Please provide a valid session or Bearer token.",
      );
    }
    redirect("/signin");
  }

  return { user, supabase };
});

/**
 * Creates a Supabase client with service role key for admin operations.
 * This bypasses Row Level Security (RLS) policies.
 *
 * ⚠️ WARNING: Only use this in server-side code (API routes, server components).
 * Never expose the service role key to the browser.
 */
export function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}
