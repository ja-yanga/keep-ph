"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  AdminUpdateClaimResponse,
  RpcAdminClaim,
  UpdateRewardClaimArgs,
  UpdateUserKycStatusArgs,
} from "@/utils/types";

const supabaseAdmin = createSupabaseServiceClient();

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

export const adminUpdateUserKyc = async ({
  userId,
  status,
}: UpdateUserKycStatusArgs) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus !== "VERIFIED" && normalizedStatus !== "REJECTED") {
    throw new Error("Invalid status");
  }

  const { data, error } = await supabaseAdmin.rpc("admin_update_user_kyc", {
    input_user_id: userId,
    input_status: normalizedStatus,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const markAsReadNotification = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { error } = await supabaseAdmin
    .from("notification_table")
    .update({ notification_is_read: true })
    .eq("user_id", userId)
    .eq("notification_is_read", false);

  if (error) {
    throw error;
  }

  return { ok: true };
};
