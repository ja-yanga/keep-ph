import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST(req: Request) {
  try {
    const { code, currentUserId } = await req.json();

    if (!code) {
      return NextResponse.json({ valid: false, message: "Code is required" });
    }

    // 1. Check if code exists in updated users_table schema
    const { data: referrer, error } = await supabaseAdmin
      .from("users_table")
      .select("users_id, users_referral_code")
      .eq("users_referral_code", code)
      .single();

    if (error || !referrer) {
      return NextResponse.json({
        valid: false,
        message: "Invalid referral code",
      });
    }

    // 2. Prevent self-referral
    if (
      currentUserId &&
      String(referrer.users_id ?? referrer.users_id) === String(currentUserId)
    ) {
      return NextResponse.json({
        valid: false,
        message: "Cannot use your own code",
      });
    }

    return NextResponse.json({ valid: true, message: "Code applied: 5% Off" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("referrals.validate error:", message);
    return NextResponse.json(
      { valid: false, message: "Server error" },
      { status: 500 },
    );
  }
}
