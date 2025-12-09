import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const THRESHOLD = 10;
    const DEFAULT_AMOUNT = 500;

    const { count, error: cErr } = await supabase
      .from("referrals_table")
      .select("*", { count: "exact", head: true })
      .eq("referrals_user_id", userId);
    if (cErr) throw cErr;
    const referralCount = (count ?? 0) as number;

    const { data: claims, error: claimsErr } = await supabase
      .from("rewards_claims")
      .select(
        "id,payment_method,account_details,amount,status,referral_count,created_at,processed_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (claimsErr) throw claimsErr;

    // Only consider admin-manageable statuses: PROCESSING and PAID
    const hasClaim = (claims ?? []).some((c: any) =>
      ["PROCESSING", "PAID"].includes(c.status)
    );

    return NextResponse.json({
      threshold: THRESHOLD,
      amount: DEFAULT_AMOUNT,
      referralCount,
      eligible: referralCount >= THRESHOLD,
      hasClaim,
      claims: claims || [],
    });
  } catch (err: any) {
    console.error("rewards.status:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
