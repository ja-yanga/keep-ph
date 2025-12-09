import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, paymentMethod, accountDetails } = body;
    if (!userId || !paymentMethod || !accountDetails) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // eligibility rules (use rewards_config if you add one)
    const THRESHOLD = 10;
    const DEFAULT_AMOUNT = 500;

    // count completed referrals for user
    const { count, error: countErr } = await supabase
      .from("referrals_table")
      .select("*", { count: "exact", head: true })
      .eq("referrals_user_id", userId);

    if (countErr) throw countErr;
    const referralCount = (count ?? 0) as number;
    if (referralCount < THRESHOLD) {
      return NextResponse.json(
        { error: "Not enough referrals" },
        { status: 403 }
      );
    }

    // prevent duplicate pending/processing claims
    const { data: existing } = await supabase
      .from("rewards_claims")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["PENDING", "PROCESSING"])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Existing pending request" },
        { status: 409 }
      );
    }

    // insert claim
    const { data, error: insertErr } = await supabase
      .from("rewards_claims")
      .insert([
        {
          user_id: userId,
          payment_method: paymentMethod,
          account_details: accountDetails,
          amount: DEFAULT_AMOUNT,
          status: "PENDING",
          referral_count: referralCount,
        },
      ])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true, claim: data });
  } catch (err: any) {
    console.error("rewards.claim:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
