// /api/auth/callback/route.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Get tokens from URL
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");
  const next = searchParams.get("next") ?? "/update-password";

  if (access_token && refresh_token) {
    const cookieStore = await cookies();
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

    // Set session so the user is logged in
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Set session error:", error);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_code_error`);
}
