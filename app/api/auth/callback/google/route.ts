import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // 1. Initialize Supabase Client (Handles Cookies Automatically for PKCE)
    const supabase = await createClient();

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

          // Sync to auth metadata when successfully created public user record
          const { error: updateError } =
            await supabase.auth.admin.updateUserById(session.user.id, {
              user_metadata: { role: "user" },
            });

          if (updateError) {
            console.error("Error updating auth metadata:", updateError);
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
