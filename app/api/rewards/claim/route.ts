import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { userId, paymentMethod, accountDetails } = await req.json();
    if (!userId || !paymentMethod || !accountDetails) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const THRESHOLD = 10;
    const DEFAULT_AMOUNT = 500;

    // count referrals where this user is the referrer (updated schema)
    const { count, error: countErr } = await supabase
      .from("referral_table")
      .select("*", { count: "exact", head: true })
      .eq("referral_referrer_user_id", userId);
    if (countErr) throw countErr;
    const referralCount = (count ?? 0) as number;
    if (referralCount < THRESHOLD) {
      return NextResponse.json(
        { error: "Not enough referrals" },
        { status: 403 },
      );
    }

    // block if user already has a claim that is pending/processing/paid (updated schema)
    const { data: existing, error: existErr } = await supabase
      .from("rewards_claim_table")
      .select("rewards_claim_id,rewards_claim_status")
      .eq("user_id", userId)
      .in("rewards_claim_status", ["PENDING", "PROCESSING", "PAID"])
      .limit(1);
    if (existErr) throw existErr;
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Reward already claimed or pending" },
        { status: 409 },
      );
    }

    // insert claim using updated schema column names
    const { data, error: insertErr } = await supabase
      .from("rewards_claim_table")
      .insert([
        {
          user_id: userId,
          rewards_claim_payment_method: paymentMethod,
          rewards_claim_account_details: accountDetails,
          rewards_claim_amount: DEFAULT_AMOUNT,
          rewards_claim_status: "PENDING",
          rewards_claim_referral_count: referralCount,
        },
      ])
      .select()
      .single();

    if (insertErr) throw insertErr;
    return NextResponse.json({ ok: true, claim: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("rewards.claim:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
