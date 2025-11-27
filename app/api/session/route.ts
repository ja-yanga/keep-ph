import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    const accessToken = match ? decodeURIComponent(match[1]) : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // fetch profile (first_name, last_name, role, needs_onboarding) from users table
    let profile: Record<string, any> | null = null;
    let needs_onboarding = true;
    try {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, role, needs_onboarding")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!profileErr && profileData) {
        profile = profileData;
        // prefer explicit column if present, otherwise compute from missing names
        if (typeof profileData.needs_onboarding === "boolean") {
          needs_onboarding = profileData.needs_onboarding;
        } else {
          needs_onboarding = !(profileData.first_name && profileData.last_name);
        }
      } else {
        // fallback: compute from absence of names on user object (safe default)
        needs_onboarding = true;
      }
    } catch (e) {
      console.error("profile lookup error:", e);
      needs_onboarding = true;
    }

    return NextResponse.json({
      ok: true,
      user: userData.user,
      profile,
      role: profile?.role ?? null,
      needs_onboarding,
    });
  } catch (err) {
    console.error("session GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
