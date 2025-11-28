import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. Securely get user from session cookie
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Check existing code in 'users' table
    const { data: existingUser } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (existingUser?.referral_code) {
      return NextResponse.json({ referral_code: existingUser.referral_code });
    }

    // 3. Generate new code if none exists
    const code = `KEEP-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // 4. Update 'users' table
    const { error: updateError } = await supabase
      .from("users")
      .update({ referral_code: code })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ referral_code: code });
  } catch (err: any) {
    console.error("Referral generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
