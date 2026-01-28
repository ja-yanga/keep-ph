// /api/auth/callback/route.ts
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Use PKCE flow with authorization code
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { user } = data;

      // Initialize user record in public users_table if it doesn't exist
      // Use service client to ensure this happens during callback
      const supabaseAdmin = createSupabaseServiceClient();

      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from("users_table")
        .select("users_id")
        .eq("users_id", user.id)
        .single();

      if (!existingUser && !checkError) {
        const { error: insertError } = await supabaseAdmin
          .from("users_table")
          .insert({
            users_id: user.id,
            users_email: user.email,
            users_role: "user",
          });

        if (insertError) {
          console.error("Error creating public user record:", insertError);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth callback error:", error);
      const errorMessage = error?.message || "Authentication failed";
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_code_error`);
}
