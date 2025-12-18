import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import type { NotificationType } from "@/lib/notifications";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type RewardDbRow = {
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, proof_base64 } = body as {
      status?: string;
      proof_base64?: string | null;
    };

    if (!status || !["PROCESSING", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // fetch existing claim using updated schema names
    const { data: oldClaimRaw, error: oldErr } = await supabaseAdmin
      .from("rewards_claim_table")
      .select(
        "rewards_claim_id, user_id, rewards_claim_status, rewards_claim_amount",
      )
      .eq("rewards_claim_id", id)
      .single();

    if (oldErr || !oldClaimRaw) {
      throw oldErr ?? new Error("Claim not found");
    }

    const oldClaim = oldClaimRaw as RewardDbRow;

    // prepare updates with typed shape
    const updates: Record<string, unknown> = {
      rewards_claim_status: status,
    };
    if (status === "PAID") {
      updates.rewards_claim_processed_at = new Date().toISOString();
    }

    // handle proof upload if provided
    if (proof_base64) {
      // expected formats: data:<mime>;base64,<data>  OR raw base64
      const raw = String(proof_base64);
      const matches = raw.match(/^data:(.+);base64,(.+)$/);
      let mime = "application/octet-stream";
      let b64 = raw;
      if (matches) {
        mime = matches[1];
        b64 = matches[2];
      } else if (raw.includes(",")) {
        b64 = raw.split(",")[1];
      }
      const ext = mime.split("/")[1] || "bin";
      const userId = oldClaim.user_id;
      const path = `${userId}/${id}.${ext}`;

      const buffer = Buffer.from(b64, "base64");
      const { error: upErr } = await supabaseAdmin.storage
        .from("REWARD-PROOFS")
        .upload(path, buffer, {
          contentType: mime,
          upsert: true,
        });

      if (upErr) {
        console.error("storage upload error", upErr);
        const serr = upErr as unknown as {
          status?: number | string;
          statusCode?: number | string;
          message?: string;
        };
        const statusCode = serr.status ?? serr.statusCode ?? 500;
        const msg = serr.message ?? String(upErr);
        if (String(statusCode) === "403") {
          return NextResponse.json(
            {
              error: `Storage upload forbidden: ${msg}. Ensure SUPABASE_SERVICE_ROLE_KEY is set and has storage permissions for bucket "REWARD-PROOFS".`,
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          { error: `Failed to upload proof: ${msg}` },
          { status: 500 },
        );
      }

      // store proof path in updated column name
      updates.rewards_claim_proof_path = path;
    }

    const { data: updatedRaw, error } = await supabaseAdmin
      .from("rewards_claim_table")
      .update(updates)
      .eq("rewards_claim_id", id)
      .select()
      .single();

    if (error) throw error;

    const updated = (updatedRaw as RewardDbRow) ?? null;

    // optionally create signed URL for the uploaded proof
    let signedUrl: string | null = null;
    if (
      updates.rewards_claim_proof_path &&
      typeof updates.rewards_claim_proof_path === "string"
    ) {
      try {
        const { data: urlData, error: urlErr } = await supabaseAdmin.storage
          .from("REWARD-PROOFS")
          .createSignedUrl(updates.rewards_claim_proof_path, 60 * 60);
        if (!urlErr && urlData?.signedUrl) signedUrl = urlData.signedUrl;
      } catch (e: unknown) {
        console.debug("createSignedUrl error:", e);
      }
    }

    // send notification if status changed
    try {
      if (
        oldClaim.rewards_claim_status !== updated?.rewards_claim_status &&
        oldClaim.user_id
      ) {
        const userId = oldClaim.user_id;
        let title = "Reward Update";
        let message = `Your reward request (${String(id).slice(0, 8)}) status is now: ${updated?.rewards_claim_status}`;
        let typeStr = "SYSTEM";

        if (updated?.rewards_claim_status === "PROCESSING") {
          title = "Reward Processing";
          message = `Your reward request (${String(id).slice(0, 8)}) is now being processed.`;
          typeStr = "REWARD_PROCESSING";
        } else if (updated?.rewards_claim_status === "PAID") {
          const amount =
            updated?.rewards_claim_amount ??
            oldClaim.rewards_claim_amount ??
            "—";
          title = "Reward Paid";
          message = `Your reward request (${String(id).slice(0, 8)}) has been paid. Amount: PHP ${amount}.`;
          typeStr = "REWARD_PAID";
        }

        const allowed = ["SYSTEM", "REWARD_PROCESSING", "REWARD_PAID"];
        const notifType = (
          allowed.includes(typeStr) ? typeStr : "SYSTEM"
        ) as NotificationType;

        await sendNotification(userId, title, message, notifType, "/referrals");
      }
    } catch (notifyErr: unknown) {
      console.error("Failed to send notification:", notifyErr);
      // do not fail main request for notification errors
    }

    // normalize return payload
    const responseClaim = updated
      ? {
          id: updated.rewards_claim_id,
          user_id: updated.user_id,
          payment_method: updated.rewards_claim_payment_method ?? null,
          account_details: updated.rewards_claim_account_details ?? null,
          amount: updated.rewards_claim_amount ?? null,
          status: updated.rewards_claim_status ?? null,
          referral_count: updated.rewards_claim_referral_count ?? null,
          created_at: updated.rewards_claim_created_at ?? null,
          processed_at: updated.rewards_claim_processed_at ?? null,
          proof_path: updated.rewards_claim_proof_path ?? null,
        }
      : null;

    return NextResponse.json({
      ok: true,
      claim: responseClaim,
      proof_url: signedUrl ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin.rewards.update:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
