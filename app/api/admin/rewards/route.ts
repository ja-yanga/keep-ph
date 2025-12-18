import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type DbClaimRow = {
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
  user?: {
    users_id?: string;
    users_email?: string;
    users_referral_code?: string | null;
  };
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("rewards_claim_table")
      .select(
        `
        rewards_claim_id,
        user_id,
        rewards_claim_payment_method,
        rewards_claim_account_details,
        rewards_claim_amount,
        rewards_claim_status,
        rewards_claim_referral_count,
        rewards_claim_created_at,
        rewards_claim_processed_at,
        rewards_claim_proof_path,
        user:users_table(users_id, users_email, users_referral_code)
      `,
      )
      .order("rewards_claim_created_at", { ascending: false });

    if (error) throw error;

    // use actual bucket name
    const BUCKET = "REWARD-PROOFS";

    const rows = await Promise.all(
      (Array.isArray(data) ? data : []).map(async (rowRaw) => {
        const row = rowRaw as DbClaimRow;
        let proofUrl: string | null = null;

        if (row.rewards_claim_proof_path) {
          try {
            const { data: urlData, error: urlErr } = await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(row.rewards_claim_proof_path, 60 * 60);
            if (!urlErr && urlData?.signedUrl) {
              proofUrl = urlData.signedUrl;
            }
          } catch (e: unknown) {
            console.error("createSignedUrl error:", e);
            // ignore and try public fallback
          }

          if (!proofUrl) {
            try {
              const { data: pub } = await supabaseAdmin.storage
                .from(BUCKET)
                .getPublicUrl(row.rewards_claim_proof_path);
              proofUrl = pub?.publicUrl ?? null;
            } catch {
              proofUrl = null;
            }
          }
        }

        return {
          id: row.rewards_claim_id,
          user_id: row.user_id,
          payment_method: row.rewards_claim_payment_method ?? null,
          account_details: row.rewards_claim_account_details ?? null,
          amount: row.rewards_claim_amount ?? null,
          status: row.rewards_claim_status ?? null,
          referral_count: row.rewards_claim_referral_count ?? null,
          created_at: row.rewards_claim_created_at ?? null,
          processed_at: row.rewards_claim_processed_at ?? null,
          proof_path: row.rewards_claim_proof_path ?? null,
          proof_url: proofUrl,
          user: row.user ?? null,
        };
      }),
    );

    return NextResponse.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin.rewards.list:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
