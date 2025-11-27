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

    // fetch profile (first_name, last_name, role) from users table
    let profile = null;
    try {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!profileErr && profileData) profile = profileData;
    } catch (e) {
      console.error("profile lookup error:", e);
    }

    return NextResponse.json({
      ok: true,
      user: userData.user,
      profile,
      role: profile?.role ?? null,
    });
  } catch (err) {
    console.error("session GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
