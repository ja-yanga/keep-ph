import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, paymentMethod, accountDetails } = await req.json();
    if (!userId || !paymentMethod || !accountDetails) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const THRESHOLD = 10;
    const DEFAULT_AMOUNT = 500;

    // count referrals
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

    // block if user already has a claim that is pending/processing/paid
    const { data: existing, error: existErr } = await supabase
      .from("rewards_claims")
      .select("id,status")
      .eq("user_id", userId)
      .in("status", ["PENDING", "PROCESSING", "PAID"])
      .limit(1);
    if (existErr) throw existErr;
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Reward already claimed or pending" },
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
