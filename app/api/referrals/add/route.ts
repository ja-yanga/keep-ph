import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type AddReferralBody = {
  user_id?: string;
  referral_code?: string;
  referred_email: string;
  service_type: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: AddReferralBody = await req.json();

    if (
      (!body.user_id && !body.referral_code) ||
      !body.referred_email ||
      !body.service_type
    ) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    let referrerUserId = body.user_id;

    // Resolve referrer from referral_code if provided
    if (body.referral_code) {
      const { data: referrer } = await supabase
        .from("users_table")
        .select("users_id")
        .eq("users_referral_code", body.referral_code)
        .maybeSingle();

      if (referrer?.users_id) {
        referrerUserId = referrer.users_id;
      } else {
        return NextResponse.json({ message: "Invalid referral code, ignored" });
      }
    }

    if (!referrerUserId) {
      return NextResponse.json(
        { error: "Could not resolve referrer" },
        { status: 400 },
      );
    }

    // Try to resolve referred user by email (may be null for external emails)
    const { data: referred } = await supabase
      .from("users_table")
      .select("users_id")
      .eq("users_email", body.referred_email)
      .maybeSingle();

    const referredUserId = referred?.users_id ?? null;

    const { error } = await supabase.from("referral_table").insert([
      {
        referral_referrer_user_id: referrerUserId,
        referral_referred_user_id: referredUserId,
        referral_service_type: body.service_type,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ message: "Referral added" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Referral API Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
