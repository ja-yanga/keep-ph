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

    // include proof_path so we can map to signed URL
    const { data: claims, error: claimsErr } = await supabase
      .from("rewards_claims")
      .select(
        "id,user_id,payment_method,account_details,amount,status,referral_count,created_at,processed_at,proof_path"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (claimsErr) throw claimsErr;

    // generate signed URLs (private bucket) or fallback to public url
    const BUCKET = "reward-proofs";
    const claimsWithUrls = await Promise.all(
      (claims || []).map(async (c: any) => {
        if (c.proof_path) {
          // try signed url
          try {
            const { data: urlData, error: urlErr } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(c.proof_path, 60 * 60); // 1 hour
            if (!urlErr && urlData?.signedUrl) {
              c.proof_url = urlData.signedUrl;
              return c;
            }
          } catch (e) {
            // ignore and try public fallback
          }
          try {
            const { data: pub } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(c.proof_path);
            c.proof_url = pub?.publicUrl ?? null;
          } catch (e) {
            c.proof_url = null;
          }
        } else {
          c.proof_url = null;
        }
        return c;
      })
    );

    // Only consider admin-manageable statuses: PROCESSING and PAID
    const hasClaim = (claimsWithUrls ?? []).some((c: any) =>
      ["PROCESSING", "PAID"].includes(c.status)
    );

    return NextResponse.json({
      threshold: THRESHOLD,
      amount: DEFAULT_AMOUNT,
      referralCount,
      eligible: referralCount >= THRESHOLD,
      hasClaim,
      claims: claimsWithUrls || [],
    });
  } catch (err: any) {
    console.error("rewards.status:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
