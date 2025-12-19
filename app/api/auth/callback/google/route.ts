import { createSupabaseServiceClient } from "@/utils/supabase/serviceClient";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to dashboard if no 'next' param is provided
  let next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // 1. Client for Auth Session (Cookie handling)
    const supabase = createSupabaseServiceClient();

    // 2. Exchange the code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      try {
        // 3. Admin Client for Database Operations (Bypass RLS)
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Check if user exists in public 'users' table
        const { data: existingUser } = await supabaseAdmin
          .from("users_table")
          .select("users_id")
          .eq("users_id", data.user.id)
          .single();

        if (!existingUser) {
          console.log("Creating new user record for:", data.user.email);

          // const fullName = data.user.user_metadata?.full_name || "";
          // const firstName = fullName.split(" ")[0] || "";
          // const lastName = fullName.split(" ").slice(1).join(" ") || "";

          const { error: insertError } = await supabaseAdmin
            .from("users_table")
            .insert({
              users_id: data.user.id,
              users_email: data.user.email,
              // first_name: firstName,
              // last_name: lastName,
              users_avatar_url: data.user.user_metadata?.avatar_url || null,
              // needs_onboarding: true, // Explicitly set for new users
            });

          if (insertError) {
            console.error(
              "Failed to insert user into public table:",
              insertError,
            );
            return NextResponse.redirect(
              `${origin}/signin?error=${encodeURIComponent("Database error saving new user")}`,
            );
          }
          // needsOnboarding = true;
          next = "/dashboard";
        } else {
          // Check existing user status
        }

        // 4. Redirect logic
        next = "/dashboard";
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        return NextResponse.redirect(
          `${origin}/signin?error=${encodeURIComponent("Database error saving new user")}`,
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else if (error) {
      console.error("Google Callback Error:", error);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/signin?error=auth_code_error`);
}
