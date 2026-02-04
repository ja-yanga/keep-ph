import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";
import type {
  AdminUpdateClaimResponse,
  RewardDbRow,
  RpcAdminClaim,
} from "@/utils/types";
import { getRewardProofUrl } from "@/app/actions/get";
import { T_NotificationType } from "@/utils/types";

const supabaseAdmin = createSupabaseServiceClient();

const uploadProof = async (
  proof_base64: string,
  claimId: string,
  userId: string,
): Promise<string | undefined> => {
  try {
    // Log the start of the upload process
    console.log("uploadProof:start", {
      claimId,
      userId,
      base64Length: proof_base64 ? proof_base64.length : 0,
    });

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
    const path = `${userId}/${claimId}.${ext}`;

    // Log the processed file info
    console.log("uploadProof:fileInfo", {
      mime,
      ext,
      path,
      b64Length: b64.length,
    });

    // Check if the bucket exists
    const { data: buckets, error: bucketsError } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      console.error("uploadProof:listBuckets:error", bucketsError);
      throw new Error(
        `Failed to list storage buckets: ${bucketsError.message}`,
      );
    }

    const bucketExists = buckets.some(
      (bucket) => bucket.name === "REWARD-PROOFS",
    );

    if (!bucketExists) {
      console.error("uploadProof:bucketNotFound", {
        buckets: buckets.map((b) => b.name),
      });
      throw new Error("Storage bucket 'REWARD-PROOFS' does not exist");
    }

    // Create buffer from base64
    const buffer = Buffer.from(b64, "base64");

    // Upload the file
    const { data: uploadData, error: upErr } = await supabaseAdmin.storage
      .from("REWARD-PROOFS")
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (upErr) {
      const serr = upErr as unknown as {
        status?: number | string;
        statusCode?: number | string;
        message?: string;
        error?: string;
      };

      const statusCode = serr.status ?? serr.statusCode ?? 500;
      const msg = serr.message ?? serr.error ?? String(upErr);

      console.error("uploadProof:uploadError", {
        statusCode,
        message: msg,
        error: upErr,
        errorJson: JSON.stringify(upErr, Object.getOwnPropertyNames(upErr)),
      });

      if (String(statusCode) === "403") {
        throw new Error(
          `Storage upload forbidden: ${msg}. Ensure SUPABASE_SERVICE_ROLE_KEY has access to "REWARD-PROOFS".`,
        );
      }

      throw new Error(`Failed to upload proof: ${msg}`);
    }

    console.log("uploadProof:success", { path, uploadData });
    return path;
  } catch (error) {
    console.error("uploadProof:unexpectedError", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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
      void logApiError(req, { status: 400, message: "Invalid status" });
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    let proofPath: string | undefined;
    if (proof_base64) {
      proofPath = await uploadProof(proof_base64, id, oldClaim.user_id);
    }

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "admin_update_reward_claim",
      {
        input_claim_id: id,
        input_status: status,
        input_proof_path: proofPath ?? null,
      },
    );

    if (rpcError) {
      throw rpcError;
    }

    let parsed: AdminUpdateClaimResponse | null = null;
    if (typeof rpcData === "string") {
      try {
        parsed = JSON.parse(rpcData) as AdminUpdateClaimResponse;
      } catch {
        parsed = null;
      }
    } else {
      parsed = rpcData as AdminUpdateClaimResponse | null;
    }

    if (!parsed?.ok || !parsed.claim) {
      const rpcMessage = parsed?.error ?? "Failed to update claim";
      throw new Error(rpcMessage);
    }

    const updated = parsed.claim as RpcAdminClaim;

    const proof_url = updated.proof_path
      ? await getRewardProofUrl(updated.proof_path)
      : null;

    try {
      if (
        oldClaim.rewards_claim_status !== updated.status &&
        oldClaim.user_id
      ) {
        const userId = oldClaim.user_id;
        let title = "Reward Update";
        let message = `Your reward request (${String(id).slice(0, 8)}) status is now: ${updated.status}`;
        let typeStr: T_NotificationType = "SYSTEM";

        if (updated.status === "PROCESSING") {
          title = "Reward Processing";
          message = `Your reward request (${String(id).slice(0, 8)}) is now being processed.`;
          typeStr = "REWARD_PROCESSING";
        } else if (updated.status === "PAID") {
          const amount = updated.amount ?? oldClaim.rewards_claim_amount ?? "—";
          title = "Reward Paid";
          message = `Your reward request (${String(id).slice(0, 8)}) has been paid. Amount: PHP ${amount}.`;
          typeStr = "REWARD_PAID";

          // Log activity when admin pays the referrer
          try {
            await logActivity({
              userId: oldClaim.user_id,
              action: "PAY",
              type: "ADMIN_ACTION",
              entityType: "REWARDS_CLAIM",
              entityId: id,
              details: {
                payment_amount: updated.amount ?? oldClaim.rewards_claim_amount,
                payment_method: updated.payment_method,
              },
            });
          } catch (logErr) {
            console.error("Failed to log reward payment activity:", logErr);
          }
        }

        await sendNotification(userId, title, message, typeStr, "/referrals");
      }
    } catch (notifyErr: unknown) {
      console.error("Failed to send notification:", notifyErr);
    }

    return NextResponse.json({
      ok: true,
      claim: updated,
      proof_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin.rewards.update:error", {
      message,
      error: err instanceof Error ? err.stack : String(err),
    });
    void logApiError(req, {
      status: 500,
      message: message || "Server error",
      error: err,
    });
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
