import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Initialize clients per request to avoid state leakage
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return NextResponse.json(
        { error: error?.message || "Signin failed" },
        { status: 401 }
      );
    }

    const session = data.session;

    // 2. Check Onboarding Status
    // We use the admin client to bypass RLS policies just in case
    let needsOnboarding = true;

    if (session.user?.id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, needs_onboarding")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        // If the flag is explicitly set in DB, use it
        if (typeof profile.needs_onboarding === "boolean") {
          needsOnboarding = profile.needs_onboarding;
        } else {
          // Fallback: check if names are missing
          needsOnboarding = !profile.first_name || !profile.last_name;
        }
      }
    }

    const res = NextResponse.json({
      ok: true,
      needsOnboarding,
      // Only force redirect if onboarding is needed.
      // Otherwise, let the client decide (usually dashboard, but could be previous page)
      redirectTo: needsOnboarding ? "/onboarding" : null,
      user: session,
    });

    // 3. Set Cookies
    // These match what your middleware expects ("sb-access-token")
    const cookieOpts = {
      httpOnly: true,
      maxAge: session.expires_in ?? 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    res.cookies.set(
      "sb-access-token",
      encodeURIComponent(session.access_token),
      cookieOpts
    );

    res.cookies.set(
      "sb-refresh-token",
      encodeURIComponent(session.refresh_token ?? ""),
      { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 }
    );

    return res;
  } catch (err: any) {
    console.error("signin route error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
