import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/utils/supabase/serviceClient";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();

    // 1. Initialize Supabase Client (Handles Cookies Automatically for PKCE)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;

      // Get the session after exchange
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const supabaseAdmin = createSupabaseServiceClient();

        // Check if user exists in public 'users' table
        const { data: existingUser } = await supabaseAdmin
          .from("users_table")
          .select("users_id")
          .eq("users_id", session.user.id)
          .single();

        if (!existingUser) {
          const { error: insertError } = await supabaseAdmin
            .from("users_table")
            .insert({
              users_id: session.user.id,
              users_email: session.user.email,
              users_avatar_url: session.user.user_metadata?.avatar_url || null,
              users_role: "user",
            });

          if (insertError) {
            console.error("Failed to insert user:", insertError);
            // Continue even if insert fails, as the auth session is valid
          }
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Authentication failed",
        )}`,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/signin?error=${encodeURIComponent("No authentication code provided")}`,
  );
}
