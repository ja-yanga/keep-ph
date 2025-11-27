import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// server-side admin client to read protected tables
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
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
    const userId = session.user?.id;

    // check users table for profile fields (server-side using service role)
    let needsOnboarding = true;
    try {
      if (userId) {
        const { data: profile, error: profileErr } = await supabaseAdmin
          .from("users")
          .select("first_name, last_name")
          .eq("id", userId)
          .limit(1)
          .maybeSingle();

        if (!profileErr && profile && profile.first_name && profile.last_name) {
          needsOnboarding = false;
        } else {
          needsOnboarding = true;
        }
      }
    } catch (e) {
      // on any error keep onboarding required (safe default)
      needsOnboarding = true;
      console.error("profile lookup error:", e);
    }

    const res = NextResponse.json({
      ok: true,
      needsOnboarding,
      sessionDebug: {
        access_token_preview: session.access_token.slice(0, 32) + "...",
        expires_at: session.expires_at,
      },
    });

    // set HttpOnly cookies so browser sends them on subsequent requests
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
      {
        ...cookieOpts,
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return res;
  } catch (err) {
    console.error("signin route error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
