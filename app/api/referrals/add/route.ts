import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AddReferralBody {
  user_id?: string;
  referral_code?: string;
  referred_email: string;
  service_type: string;
}

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
        { status: 400 }
      );
    }

    let targetUserId = body.user_id;

    // If referral_code is provided, look up the user ID
    if (body.referral_code) {
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", body.referral_code)
        .maybeSingle();

      if (referrer) {
        targetUserId = referrer.id;
      } else {
        // Code invalid or not found, we can either error out or just ignore the referral
        return NextResponse.json({ message: "Invalid referral code, ignored" });
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Could not resolve referrer" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("referrals_table").insert([
      {
        referrals_user_id: targetUserId,
        referrals_referred_email: body.referred_email,
        referrals_service_type: body.service_type,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ message: "Referral added" });
  } catch (err: any) {
    console.error("Referral API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
