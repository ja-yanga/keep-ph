import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AdminUpdateClaimResponse, RpcAdminClaim } from "@/utils/types";

const supabaseAdmin = createSupabaseServiceClient();

type UpdateRewardClaimArgs = {
  claimId: string;
  status: "PROCESSING" | "PAID";
  proofPath?: string | null;
};

export const updateRewardClaim = async ({
  claimId,
  status,
  proofPath = null,
}: UpdateRewardClaimArgs): Promise<AdminUpdateClaimResponse> => {
  const { data, error } = await supabaseAdmin.rpc("admin_update_reward_claim", {
    input_claim_id: claimId,
    input_status: status,
    input_proof_path: proofPath,
  });

  if (error) {
    throw error;
  }

  let parsed: AdminUpdateClaimResponse | null = null;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data) as AdminUpdateClaimResponse;
    } catch {
      parsed = null;
    }
  } else {
    parsed = data as AdminUpdateClaimResponse | null;
  }

  if (!parsed?.ok || !parsed.claim) {
    const message = parsed?.error ?? "Failed to update reward claim";
    throw new Error(message);
  }

  return {
    ok: true,
    claim: parsed.claim as RpcAdminClaim,
  };
};
