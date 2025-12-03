import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to dashboard if no 'next' param is provided
  let next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();

    // 1. Client for Auth Session (Cookie handling)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // 2. Exchange the code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      try {
        // 3. Admin Client for Database Operations (Bypass RLS)
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if user exists in public 'users' table
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, needs_onboarding, first_name, last_name")
          .eq("id", data.user.id)
          .single();

        let needsOnboarding = true;

        if (!existingUser) {
          console.log("Creating new user record for:", data.user.email);

          const fullName = data.user.user_metadata?.full_name || "";
          const firstName = fullName.split(" ")[0] || "";
          const lastName = fullName.split(" ").slice(1).join(" ") || "";

          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert({
              id: data.user.id,
              email: data.user.email,
              first_name: firstName,
              last_name: lastName,
              avatar_url: data.user.user_metadata?.avatar_url || null,
              needs_onboarding: true, // Explicitly set for new users
            });

          if (insertError) {
            console.error(
              "Failed to insert user into public table:",
              insertError
            );
          }
          needsOnboarding = true;
        } else {
          // Check existing user status
          if (typeof existingUser.needs_onboarding === "boolean") {
            needsOnboarding = existingUser.needs_onboarding;
          } else {
            // Fallback logic if column is null or missing
            needsOnboarding = !(
              existingUser.first_name && existingUser.last_name
            );
          }
        }

        // 4. Redirect logic based on onboarding status
        if (needsOnboarding) {
          next = "/onboarding";
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else if (error) {
      console.error("Google Callback Error:", error);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/signin?error=auth_code_error`);
}
