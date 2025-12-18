import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RawClaimRow = {
  rewards_claim_id: string;
  user_id: string;
  rewards_claim_payment_method?: string | null;
  rewards_claim_account_details?: string | null;
  rewards_claim_amount?: number | null;
  rewards_claim_status?: string | null;
  rewards_claim_referral_count?: number | null;
  rewards_claim_created_at?: string | null;
  rewards_claim_processed_at?: string | null;
  rewards_claim_proof_path?: string | null;
};

type ClaimWithUrl = {
  id: string;
  user_id: string;
  payment_method?: string | null;
  account_details?: string | null;
  amount?: number | null;
  status?: string | null;
  referral_count?: number | null;
  created_at?: string | null;
  processed_at?: string | null;
  proof_path?: string | null;
  proof_url?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const THRESHOLD = 10;
    const DEFAULT_AMOUNT = 500;

    // count referrals where this user is the referrer
    const { count, error: cErr } = await supabase
      .from("referral_table")
      .select("*", { count: "exact", head: true })
      .eq("referral_referrer_user_id", userId);
    if (cErr) throw cErr;
    const referralCount = (count ?? 0) as number;

    // fetch rewards claims for the user, map schema column names
    const { data: rawClaims, error: claimsErr } = await supabase
      .from("rewards_claim_table")
      .select(
        [
          "rewards_claim_id",
          "user_id",
          "rewards_claim_payment_method",
          "rewards_claim_account_details",
          "rewards_claim_amount",
          "rewards_claim_status",
          "rewards_claim_referral_count",
          "rewards_claim_created_at",
          "rewards_claim_processed_at",
          "rewards_claim_proof_path",
        ].join(","),
      )
      .eq("user_id", userId)
      .order("rewards_claim_created_at", { ascending: false });
    if (claimsErr) throw claimsErr;

    // treat rawClaims as unknown and narrow safely without using `any`
    const maybe = rawClaims as unknown;
    const rows: RawClaimRow[] = Array.isArray(maybe)
      ? (maybe as unknown[]).filter((item): item is RawClaimRow => {
          if (!item || typeof item !== "object") return false;
          const rec = item as Record<string, unknown>;
          return (
            typeof rec.rewards_claim_id === "string" &&
            typeof rec.user_id === "string"
          );
        })
      : [];

    // generate signed URLs (private bucket) or fallback to public url
    const BUCKET = "reward-proofs";
    const claimsWithUrls: ClaimWithUrl[] = await Promise.all(
      rows.map(async (c) => {
        const claim: ClaimWithUrl = {
          id: c.rewards_claim_id,
          user_id: c.user_id,
          payment_method: c.rewards_claim_payment_method ?? null,
          account_details: c.rewards_claim_account_details ?? null,
          amount: c.rewards_claim_amount ?? null,
          status: c.rewards_claim_status ?? null,
          referral_count: c.rewards_claim_referral_count ?? null,
          created_at: c.rewards_claim_created_at ?? null,
          processed_at: c.rewards_claim_processed_at ?? null,
          proof_path: c.rewards_claim_proof_path ?? null,
          proof_url: null,
        };

        if (claim.proof_path) {
          try {
            const { data: urlData, error: urlErr } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(claim.proof_path, 60 * 60);
            if (!urlErr && urlData?.signedUrl) {
              claim.proof_url = urlData.signedUrl;
              return claim;
            }
          } catch {
            // ignore and try public fallback
          }
          try {
            const { data: pub } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(claim.proof_path);
            claim.proof_url = pub?.publicUrl ?? null;
          } catch {
            claim.proof_url = null;
          }
        }

        return claim;
      }),
    );

    const hasClaim = claimsWithUrls.some((c) =>
      ["PROCESSING", "PAID"].includes(String(c.status)),
    );

    return NextResponse.json({
      threshold: THRESHOLD,
      amount: DEFAULT_AMOUNT,
      referralCount,
      eligible: referralCount >= THRESHOLD,
      hasClaim,
      claims: claimsWithUrls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("rewards.status:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
