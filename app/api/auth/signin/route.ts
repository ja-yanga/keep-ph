import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Initialize Supabase Client (Handles Cookies Automatically)
    // This ensures the cookies set here match what Middleware expects
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
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { email, password } = await request.json();

    // 2. Sign In
    // This triggers the setAll method above, setting the correct cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 3. Check Onboarding (using Admin client to bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let needsOnboarding = true;
    if (data.user?.id) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, needs_onboarding")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        if (typeof profile.needs_onboarding === "boolean") {
          needsOnboarding = profile.needs_onboarding;
        } else {
          needsOnboarding = !profile.first_name || !profile.last_name;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      needsOnboarding,
      redirectTo: needsOnboarding ? "/onboarding" : "/dashboard",
    });
  } catch (err: any) {
    console.error("Signin error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
