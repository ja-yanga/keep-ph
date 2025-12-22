import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { normalizeClaim, toBoolean, toNumber } from "@/utils/helper";
import {
  ClaimWithUrl,
  RewardsStatusResult,
  RpcClaim,
} from "@/utils/types/types";

const BUCKET = "REWARD-PROOFS";

const supabaseAdmin = createSupabaseServiceClient();

const resolveProofUrl = async (path: string): Promise<string | null> => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // ignore signed-url failure and fall back to public URL
  }

  try {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
};

export async function getRewardStatus(
  userId: string,
): Promise<RewardsStatusResult> {
  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("get_rewards_status", {
      input_user_id: userId,
    });

    if (error) {
      throw error;
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      return {
        threshold: 10,
        amount: 500,
        referralCount: 0,
        eligible: false,
        hasClaim: false,
        claims: [],
      };
    }

    // Parse data if it's a string, otherwise use as is
    const payload = typeof data === "string" ? JSON.parse(data) : data;

    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid rewards status payload");
    }

    // Safely access claims property and ensure it's an array
    const payloadRecord = payload as Record<string, unknown>;
    const claimArray = Array.isArray(payloadRecord.claims)
      ? (payloadRecord.claims as RpcClaim[])
      : [];

    const normalizedClaims = claimArray
      .map((claim) => normalizeClaim(claim))
      .filter((claim): claim is ClaimWithUrl => claim !== null);

    const claimsWithUrls = await Promise.all(
      normalizedClaims.map(async (claim) => {
        if (!claim.proof_path) {
          return claim;
        }

        const proofUrl = await resolveProofUrl(claim.proof_path);
        return { ...claim, proof_url: proofUrl };
      }),
    );

    return {
      threshold: toNumber(payloadRecord.threshold, 10),
      amount: toNumber(payloadRecord.amount, 500),
      referralCount: toNumber(payloadRecord.referralCount, 0),
      eligible: toBoolean(payloadRecord.eligible),
      hasClaim: toBoolean(payloadRecord.hasClaim),
      claims: claimsWithUrls,
    };
  } catch (err) {
    throw err;
  }
}
