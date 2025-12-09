import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("rewards_claims")
      .select(
        `
        id,
        user_id,
        payment_method,
        account_details,
        amount,
        status,
        referral_count,
        created_at,
        processed_at,
        proof_path,
        user:users(id, email, first_name, last_name, referral_code)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const BUCKET = "reward-proofs";
    const rows = await Promise.all(
      (data || []).map(async (row: any) => {
        if (row.proof_path) {
          // try signed url first (private bucket)
          try {
            const { data: urlData, error: urlErr } = await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(row.proof_path, 60 * 60); // 1 hour
            if (!urlErr && urlData?.signedUrl) {
              row.proof_url = urlData.signedUrl;
              return row;
            }
          } catch (e) {
            // ignore and try public fallback
          }
          // public fallback (if bucket is public)
          try {
            const { data: pub } = supabaseAdmin.storage
              .from(BUCKET)
              .getPublicUrl(row.proof_path);
            row.proof_url = pub?.publicUrl ?? null;
          } catch (e) {
            row.proof_url = null;
          }
        } else {
          row.proof_url = null;
        }
        return row;
      })
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("admin.rewards.list:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
