import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { code, currentUserId } = await req.json();

    if (!code) {
      return NextResponse.json({ valid: false, message: "Code is required" });
    }

    // 1. Check if code exists in users table
    const { data: referrer, error } = await supabaseAdmin
      .from("users")
      .select("id, referral_code")
      .eq("referral_code", code)
      .single();

    if (error || !referrer) {
      return NextResponse.json({
        valid: false,
        message: "Invalid referral code",
      });
    }

    // 2. Prevent self-referral
    if (currentUserId && referrer.id === currentUserId) {
      return NextResponse.json({
        valid: false,
        message: "Cannot use your own code",
      });
    }

    return NextResponse.json({ valid: true, message: "Code applied: 5% Off" });
  } catch (err) {
    return NextResponse.json(
      { valid: false, message: "Server error" },
      { status: 500 }
    );
  }
}
