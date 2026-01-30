"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  normalizeAdminClaim,
  normalizeClaim,
  toBoolean,
  toNumber,
} from "@/utils/helper";
import { T_RawTransaction } from "@/utils/transform/transaction";
import {
  AdminClaim,
  AdminDashboardStats,
  AdminUserKyc,
  AdminUsersRpcResult,
  BarangayTableRow,
  CityTableRow,
  ClaimWithUrl,
  MailroomPlanRow,
  MailroomRegistrationStats,
  ProvinceTableRow,
  RegCounts,
  RegionTableRow,
  RewardsStatusResult,
  RpcAdminClaim,
  RpcClaim,
  RpcMailroomPlan,
  UserAddressRow,
} from "@/utils/types";
import {
  T_TransactionPaginationMeta,
  T_TransactionStats,
} from "@/utils/types/transaction";

const supabaseAdmin = createSupabaseServiceClient();

const parseRpcArray = <T>(input: unknown): T[] => {
  if (Array.isArray(input)) {
    return input as T[];
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Fetches all reward claims for admin review with proof URLs.
 * Returns an array of admin claims with normalized data and proof URLs.
 *
 * Used in:
 * - app/api/admin/rewards/route.ts - API endpoint for admin rewards list
 * - components/pages/admin/RewardsPage/AdminRewards.tsx - Admin rewards management page (via API)
 */
export async function getAdminRewardClaims(): Promise<AdminClaim[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("admin_list_reward_claims");
    if (error) {
      throw error;
    }

    const payload = parseRpcArray<RpcAdminClaim>(data);

    const normalized = payload
      .map((item) => normalizeAdminClaim(item))
      .filter((claim): claim is AdminClaim => claim !== null);

    const claimsWithProof = await Promise.all(
      normalized.map(async (claim) => {
        const proofUrl = claim.proof_path
          ? await getRewardProofUrl(claim.proof_path)
          : null;
        return { ...claim, proof_url: proofUrl };
      }),
    );

    return claimsWithProof;
  } catch (err) {
    throw err;
  }
}

/**
 * Gets the rewards status for a specific user including referral count, eligibility, and claims.
 * Returns threshold, amount, referral count, eligibility status, and all claims with proof URLs.
 *
 * Used in:
 * - app/api/rewards/status/route.ts - API endpoint for rewards status
 * - components/pages/customer/ReferralsPage/ReferralsContent.tsx - Referrals page (via API)
 */
export async function getRewardStatus(
  userId: string,
): Promise<RewardsStatusResult> {
  if (!userId) {
    throw new Error("userId is required");
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid userId format: expected UUID, got "${userId}"`);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("get_rewards_status", {
      input_user_id: userId,
    });

    if (error) {
      console.error("Supabase RPC error in getRewardStatus:", {
        error,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      return {
        eligibleMilestones: 0,
        claimedMilestones: 0,
        claimableCount: 0,
        amountPerMilestone: 500,
        referralCount: 0,
        eligible: false,
        hasClaim: false,
        claims: [],
        threshold: 10,
      };
    }

    // Parse data if it's a string, otherwise use as is
    let payload: unknown;
    try {
      payload = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.error("Failed to parse RPC response:", {
        data,
        parseError,
        userId,
      });
      throw new Error("Failed to parse rewards status response");
    }

    if (!payload || typeof payload !== "object") {
      console.error("Invalid payload structure:", { payload, userId });
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

        try {
          const proofUrl = await getRewardProofUrl(claim.proof_path);
          return { ...claim, proof_url: proofUrl };
        } catch (proofError) {
          console.error("Error getting proof URL:", {
            proofError,
            proof_path: claim.proof_path,
          });
          return { ...claim, proof_url: null };
        }
      }),
    );

    return {
      eligibleMilestones: toNumber(payloadRecord.eligibleMilestones, 0),
      claimedMilestones: toNumber(payloadRecord.claimedMilestones, 0),
      claimableCount: toNumber(payloadRecord.claimableCount, 0),
      amountPerMilestone: toNumber(payloadRecord.amount_per_milestone, 500),
      referralCount: toNumber(payloadRecord.referralCount, 0),
      eligible: toBoolean(payloadRecord.eligible),
      hasClaim: toNumber(payloadRecord.claimedMilestones, 0) > 0,
      claims: claimsWithUrls,
      threshold: toNumber(payloadRecord.threshold, 10),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Generates a signed or public URL for a reward proof file from storage.
 * Attempts to create a signed URL first, falls back to public URL if that fails.
 *
 * Used in:
 * - app/actions/get.ts - getAdminRewardClaims() and getRewardStatus() (internal)
 * - app/api/admin/rewards/[id]/route.ts - Admin reward claim update endpoint
 */
export const getRewardProofUrl = async (
  path: string,
): Promise<string | null> => {
  const BUCKET = "REWARD-PROOFS";
  if (!path) return null;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // ignore and fall back to public URL
  }

  try {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
};

/**
 * Gets the KYC verification status for a specific user by user ID.
 * Returns the verification status string (e.g., "VERIFIED", "SUBMITTED", "REJECTED") or null.
 *
 * Used in:
 * - app/api/user/verification-status/route.ts - API endpoint for verification status
 * - app/mailroom/register/page.tsx - Checks if user is verified before allowing mailroom registration
 * - app/dashboard/page.tsx - Server component to check verification status
 */
export async function getUserVerificationStatus(
  userId: string,
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid userId format: expected UUID, got "${userId}"`);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("user_is_verified", {
      input_user_id: userId,
    });

    if (error) {
      console.error("Supabase RPC error in getUserVerificationStatus:", {
        error,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    return data ?? null;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets mailroom registrations for a specific user using RPC.
 * Returns an array of mailroom registrations with related data (location, plan, subscription, user, KYC).
 *
 * Used in:
 * - app/dashboard/page.tsx - Server component to fetch registrations and pass to client component
 */
export async function getMailroomRegistrations(
  userId: string,
  options?: {
    search?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  data: unknown[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}> {
  if (!userId) {
    return {
      data: [],
      pagination: { total: 0, limit: 0, offset: 0, has_more: false },
    };
  }

  const { search = null, page = 1, limit = 10 } = options || {};

  // Calculate offset from page number
  const offset = (page - 1) * limit;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid userId format: expected UUID, got "${userId}"`);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "get_user_mailroom_registrations",
      {
        input_user_id: userId,
        search_query: search || null,
        page_limit: limit,
        page_offset: offset,
      },
    );

    if (error) {
      console.error("Supabase RPC error in getMailroomRegistrations:", {
        error,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      return {
        data: [],
        pagination: { total: 0, limit: 0, offset: 0, has_more: false },
      };
    }

    // Parse data if it's a string, otherwise use as is
    let payload: unknown;
    try {
      payload = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.error("Failed to parse RPC response:", {
        data,
        parseError,
        userId,
      });
      throw new Error("Failed to parse mailroom registrations response");
    }

    // Handle new response format with data and pagination
    if (payload && typeof payload === "object" && "data" in payload) {
      const result = payload as {
        data: unknown;
        pagination?: {
          total: number;
          limit: number;
          offset: number;
          has_more: boolean;
        };
      };
      const dataArray = Array.isArray(result.data) ? result.data : [];

      return { data: dataArray, pagination: result.pagination };
    }

    // Fallback for old format (array)
    if (Array.isArray(payload)) {
      return { data: payload };
    }

    console.error("Invalid payload structure:", { payload, userId });
    return { data: [] };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets a single mailroom registration by ID for a user.
 * Fetches registration with deep relations and assigned lockers.
 *
 * Used in:
 * - app/api/mailroom/registrations/[id]/route.ts
 */
export async function getMailroomRegistration(
  userId: string,
  registrationId: string,
): Promise<{ registration: unknown; lockers: unknown[] } | null> {
  try {
    // 1. Fetch Registration with relations using RPC
    const { data: registration, error } = await supabaseAdmin.rpc(
      "get_user_mailroom_registration",
      {
        input_data: {
          input_user_id: userId,
          input_registration_id: registrationId,
        },
      },
    );

    if (error) {
      console.error("Registration fetch error:", error);
      return null;
    }

    // 2. Fetch Assigned Lockers using RPC
    const { data: assignedLockers } = await supabaseAdmin.rpc(
      "get_user_assigned_lockers",
      {
        input_data: {
          input_registration_id: registrationId,
        },
      },
    );

    return {
      registration,
      lockers: assignedLockers ?? [],
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets all mailroom plans via RPC.
 * Returns an array of mailroom plans with pricing and capabilities.
 */
export async function getMailroomPlans(): Promise<
  Array<{
    id: string;
    name: string;
    price: number;
    description: string | null;
    storage_limit: number | null;
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
    can_digitize: boolean;
  }>
> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_mailroom_plans");

    if (error) {
      console.error("Error fetching mailroom plans via RPC:", {
        error,
        code: error.code,
        message: error.message,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    const payload = parseRpcArray<RpcMailroomPlan>(data);

    return (
      payload?.map((plan) => ({
        id: plan.mailroom_plan_id,
        name: plan.mailroom_plan_name,
        price: Number(plan.mailroom_plan_price),
        description: plan.mailroom_plan_description,
        storage_limit: plan.mailroom_plan_storage_limit,
        can_receive_mail: plan.mailroom_plan_can_receive_mail,
        can_receive_parcels: plan.mailroom_plan_can_receive_parcels,
        can_digitize: plan.mailroom_plan_can_digitize,
      })) ?? []
    );
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

export async function adminListMailroomPlans(): Promise<MailroomPlanRow[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "admin_list_mailroom_plans",
    );

    if (error) {
      console.error("Error fetching admin mailroom plans:", {
        error,
        code: error.code,
        message: error.message,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${
          error.code ? ` (${error.code})` : ""
        }`,
      );
    }

    return parseRpcArray<MailroomPlanRow>(data);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets all mailroom locations.
 * Returns an array of mailroom locations with address information.
 *
 * Used in:
 * - app/api/mailroom/locations/route.ts - API endpoint for locations
 * - app/mailroom/register/page.tsx - Server component to fetch locations (via API)
 */
export async function getMailroomLocations(): Promise<
  Array<{
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    barangay: string | null;
    zip: string | null;
  }>
> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_mailroom_locations", {
      input_data: {},
    });

    if (error) {
      console.error("Error fetching mailroom locations:", {
        error,
        code: error.code,
        message: error.message,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    return parseRpcArray(data);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets locker availability counts per location.
 * Returns a record mapping location IDs to available locker counts.
 *
 * Used in:
 * - app/api/mailroom/locations/availability/route.ts - API endpoint for availability
 * - app/mailroom/register/page.tsx - Server component to fetch availability (via API)
 */
export async function getLocationAvailability(): Promise<
  Record<string, number>
> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "get_location_availability",
      {
        input_data: {},
      },
    );

    if (error) {
      console.error("Error fetching location availability:", {
        error,
        code: error.code,
        message: error.message,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      return {};
    }

    // Parse data if it's a string, otherwise use as is
    let payload: Record<string, number>;
    try {
      payload = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.error("Failed to parse RPC response:", {
        data,
        parseError,
      });
      throw new Error("Failed to parse location availability response");
    }

    return payload || {};
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

export async function getUserAddresses(
  userId: string,
): Promise<UserAddressRow[]> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc("user_list_addresses", {
    input_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return parseRpcArray<UserAddressRow>(data);
}

export async function adminListUserKyc(
  search = "",
  limit = 500,
  offset = 0,
  status?: string,
): Promise<{ data: AdminUserKyc[]; total_count: number }> {
  const { data, error } = await supabaseAdmin.rpc("admin_list_user_kyc", {
    input_search: search,
    input_limit: limit,
    input_offset: offset,
    input_status: status ?? null,
  });

  if (error) {
    throw error;
  }

  const payload =
    typeof data === "string" ? JSON.parse(data) : (data as unknown);

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !("total_count" in payload)
  ) {
    return { data: [], total_count: 0 };
  }

  const result = payload as { data: AdminUserKyc[]; total_count: number };

  return {
    data: Array.isArray(result.data) ? result.data : [],
    total_count: Number(result.total_count) || 0,
  };
}

export async function getUserRole(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc("get_user_role", {
    input_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getDashboardContent(): Promise<AdminDashboardStats | null> {
  const { data, error } = await supabaseAdmin.rpc("admin_dashboard_stats");

  if (error) {
    throw error;
  }

  return (data as AdminDashboardStats | null) ?? null;
}

/**
 * Gets a payment transaction by order ID using RPC.
 *
 * Used in:
 * - app/api/payments/lookup-by-order/route.ts
 */
export async function getPaymentTransactionByOrder(
  orderId: string,
): Promise<unknown | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "get_payment_transaction_by_order",
      {
        input_data: {
          order_id: orderId,
        },
      },
    );

    if (error) {
      console.error("Error fetching payment transaction by order:", {
        error,
        orderId,
      });
      return null;
    }

    return data ?? null;
  } catch (err) {
    console.error("getPaymentTransactionByOrder unexpected error:", err);
    return null;
  }
}

/**
 * Gets mailroom registration by order ID.

 * Looks up the payment transaction first, then fetches the registration.
 *
 * Used in:
 * - app/api/mailroom/lookup-by-order/route.ts - API endpoint for order lookup
 */
export async function getMailroomRegistrationByOrder(
  orderId: string,
): Promise<unknown | null> {
  try {
    if (!orderId) {
      return null;
    }

    const { data, error } = await supabaseAdmin.rpc(
      "get_mailroom_registration_by_order",
      {
        input_data: {
          order_id: orderId,
        },
      },
    );

    if (error) {
      console.error("[getMailroomRegistrationByOrder] RPC error:", error);
      throw new Error(`Database error: ${error.message || "Unknown error"}`);
    }

    return data ?? null;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Calculates the registration amount based on plan, locker quantity, months, and referral code.
 *
 * Used in:
 * - app/api/mailroom/register/route.ts - API endpoint for registration
 */
export async function calculateRegistrationAmount({
  planId,
  lockerQty,
  months,
  referralCode,
}: {
  planId: string;
  lockerQty: number;
  months: number;
  referralCode?: string;
}): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "calculate_registration_amount",
      {
        input_data: {
          plan_id: planId,
          locker_qty: lockerQty,
          months: months,
          referral_code: referralCode,
        },
      },
    );

    if (error) {
      throw error;
    }

    return Number(data);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Checks if enough lockers are available at a location.
 *
 * Used in:
 * - app/api/mailroom/register/route.ts - API endpoint for registration
 */
export async function checkLockerAvailability({
  locationId,
  lockerQty,
}: {
  locationId: string;
  lockerQty: number;
}): Promise<{ available: boolean; count: number }> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "check_locker_availability",
      {
        input_data: {
          location_id: locationId,
          locker_qty: lockerQty,
        },
      },
    );

    if (error) {
      throw error;
    }

    const payload = typeof data === "string" ? JSON.parse(data) : data;

    return {
      available: Boolean(payload.available),
      count: Number(payload.count),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

export async function getUserMailroomStats(
  userId: string,
): Promise<{ stored: number; pending: number; released: number } | null> {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.rpc("get_user_mailroom_stats", {
    input_user_id: userId,
  });
  if (error) throw error;
  const payload = typeof data === "string" ? JSON.parse(data) : data;
  if (!payload || typeof payload !== "object") return null;
  return {
    stored: Number((payload as Record<string, unknown>).stored ?? 0),
    pending: Number((payload as Record<string, unknown>).pending ?? 0),
    released: Number((payload as Record<string, unknown>).released ?? 0),
  };
}

/**
 * Gets all admin mailroom packages with related data (packages, registrations, lockers, assigned lockers).
 * Returns an object with packages array, registrations array, lockers array, assignedLockers array, and total count.
 *
 * Used in:
 * - app/api/admin/mailroom/packages/route.ts - API endpoint for admin packages
 */
export async function adminGetMailroomPackages(args: {
  limit?: number;
  offset?: number;
  compact?: boolean;
  status?: string[];
}): Promise<{
  packages: unknown[];
  registrations: unknown[];
  lockers: unknown[];
  assignedLockers: unknown[];
  totalCount: number;
  counts?: Record<string, number>;
}> {
  const limit = Math.min(args.limit ?? 50, 200);
  const offset = args.offset ?? 0;
  const compact = args.compact ?? false;
  const status = args.status ?? null;

  const { data, error } = await supabaseAdmin.rpc(
    "get_admin_mailroom_packages",
    {
      input_limit: limit,
      input_offset: offset,
      input_compact: compact,
      input_status: status,
    },
  );

  if (error) {
    throw error;
  }

  // Parse data if it's a string, otherwise use as is
  let rpcData: Record<string, unknown> = {};
  try {
    rpcData =
      typeof data === "string"
        ? JSON.parse(data)
        : (data as Record<string, unknown>);
  } catch (parseError) {
    console.error("Failed to parse RPC response:", parseError);
    throw new Error("Failed to parse response");
  }

  const packages = Array.isArray(rpcData.packages) ? rpcData.packages : [];
  const registrations = Array.isArray(rpcData.registrations)
    ? rpcData.registrations
    : [];
  const lockers = Array.isArray(rpcData.lockers) ? rpcData.lockers : [];
  const assignedLockers = Array.isArray(rpcData.assignedLockers)
    ? rpcData.assignedLockers
    : [];
  const totalCount =
    typeof rpcData.total_count === "number"
      ? rpcData.total_count
      : packages.length;

  const counts = (rpcData.counts as Record<string, number>) || undefined;

  return {
    packages,
    registrations,
    lockers,
    assignedLockers,
    totalCount,
    counts,
  };
}

export async function adminGetArchivedPackages(args: {
  limit?: number;
  offset?: number;
}): Promise<{
  packages: unknown[];
  totalCount: number;
}> {
  const limit = Math.min(args.limit ?? 50, 200);
  const offset = args.offset ?? 0;

  const { data, error } = await supabaseAdmin.rpc(
    "get_admin_archived_packages",
    {
      input_limit: limit,
      input_offset: offset,
    },
  );

  if (error) {
    throw error;
  }

  let rpcData: Record<string, unknown> = {};
  try {
    rpcData =
      typeof data === "string"
        ? JSON.parse(data)
        : (data as Record<string, unknown>);
  } catch (parseError) {
    console.error("Failed to parse RPC response:", parseError);
    throw new Error("Failed to parse response");
  }

  const packages = Array.isArray(rpcData.packages) ? rpcData.packages : [];
  const totalCount =
    typeof rpcData.total_count === "number"
      ? rpcData.total_count
      : packages.length;

  return {
    packages,
    totalCount,
  };
}

export async function getUserMailroomRegistrationStats(
  userId: string,
): Promise<MailroomRegistrationStats[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "get_user_mailroom_registrations_stat",
      {
        input_user_id: userId,
      },
    );

    if (error) {
      console.error("Error fetching user mailroom registration stats:", error);
      throw error;
    }

    return (data as MailroomRegistrationStats[]) || [];
  } catch (err) {
    console.error("getUserMailroomRegistrationStats error:", err);
    return [];
  }
}

export async function getAllMailRoomLocation() {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_list_mailroom_locations",
  );

  if (error) throw error;
  return data;
}

export async function getMailroomRegistrationsWithStats(
  userId: string,
  options?: {
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  if (!userId) return { data: [], stats: null, total: 0 };

  try {
    // 1. Get Registrations with pagination
    const { data: registrations, pagination } = await getMailroomRegistrations(
      userId,
      options,
    );
    const registrationsArray = registrations as Record<string, unknown>[];

    // 2. Get Overall Stats (always fetch for all registrations, not just current page)
    let totals: Record<string, unknown> | null = null;
    try {
      totals = await getUserMailroomStats(userId);
    } catch (e) {
      console.error("Failed to get user mailroom stats:", e);
    }

    // 3. Get Per-Registration Stats (for current page registrations only)
    let regStatsRaw: Array<{
      mailroom_registration_id: string;
      stored: number;
      pending: number;
      released: number;
    }> = [];
    try {
      regStatsRaw = await getUserMailroomRegistrationStats(userId);
    } catch (e) {
      console.error("Failed to get user mailroom registration stats:", e);
    }

    // 4. Merge Stats
    const toStr = (v: unknown): string =>
      v === undefined || v === null ? "" : String(v);
    const regMap = new Map<string, RegCounts>();

    if (Array.isArray(regStatsRaw) && regStatsRaw.length > 0) {
      for (const s of regStatsRaw) {
        const sRec = s as unknown as Record<string, unknown>; // Safety cast
        const key = toStr(
          sRec.mailroom_registration_id ?? sRec.id ?? sRec.registration_id,
        ).toLowerCase();
        if (!key) continue;
        const stored = Number(sRec.stored ?? 0);
        const pending = Number(sRec.pending ?? 0);
        const released = Number(sRec.released ?? 0);
        regMap.set(key, { stored, pending, released });
      }
    } else {
      // Fallback: build counts from mailbox_item_table for current page registrations
      const regIds = registrationsArray
        .map((r) =>
          toStr(r.mailroom_registration_id ?? r.id ?? r.registration_id ?? ""),
        )
        .filter(Boolean);

      if (regIds.length > 0) {
        // Optimized query: filter by registration IDs using RPC
        const { data: itemsData, error: itemsErr } = await supabaseAdmin.rpc(
          "get_user_mailbox_items_by_registrations",
          {
            input_data: {
              input_registration_ids: regIds,
            },
          },
        );

        if (!itemsErr && Array.isArray(itemsData)) {
          for (const item of itemsData) {
            const idKey = toStr(item.mailroom_registration_id).toLowerCase();
            if (!idKey) continue;

            const status = toStr(item.mailbox_item_status).toUpperCase();
            const cur = regMap.get(idKey) ?? {
              stored: 0,
              pending: 0,
              released: 0,
            };

            if (status === "RELEASED") cur.released += 1;
            else if (status.includes("REQUEST")) {
              cur.pending += 1;
              // REQUEST_TO_SCAN, REQUEST_TO_RELEASE, and REQUEST_TO_DISPOSE should still be counted as stored
              if (
                [
                  "REQUEST_TO_SCAN",
                  "REQUEST_TO_RELEASE",
                  "REQUEST_TO_DISPOSE",
                ].includes(status)
              ) {
                cur.stored += 1;
              }
            } else if (
              !["RELEASED", "RETRIEVED", "DISPOSED"].includes(status)
            ) {
              cur.stored += 1;
            }

            regMap.set(idKey, cur);
          }
        } else {
          console.error("mailbox_item_table query error:", itemsErr);
        }
      }
    }

    // 5. Map stats to registrations
    const results = registrationsArray.map((r) => {
      const idKey = toStr(
        r.mailroom_registration_id ?? r.id ?? r.registration_id ?? "",
      ).toLowerCase();
      const statsObj = regMap.get(idKey) ?? null;
      return {
        ...r,
        _stats: statsObj,
      };
    });

    return {
      data: results,
      stats: totals,
      pagination,
    };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Fetches notifications for a specific user via RPC.
 * Returns an array of notifications, sorted by creation date (desc), limited to 10.
 */
export async function getNotificationByUserId(
  userId: string,
  limit: number = 10,
  offset: number = 2,
) {
  if (!userId) return [];

  const { data, error } = await supabaseAdmin.rpc("get_user_notifications", {
    input_user_id: userId,
    input_limit: limit,
    input_offset: offset,
  });

  if (error) {
    console.error("Error fetching notifications via RPC:", error);
    throw new Error(
      `Database error: ${error.message || "Unknown error"}${
        error.code ? ` (${error.code})` : ""
      }`,
    );
  }

  // RPC returns JSONB which is already parsed
  return data ?? [];
}

export const getUserSession = async (userId: string) => {
  const { data: sessionData, error: sessionErr } = await supabaseAdmin.rpc(
    "get_user_session_data",
    {
      input_user_id: userId,
    },
  );

  return { sessionData, sessionErr };
};

/**
 * Gets user storage files and usage stats via RPC with pagination and filtering.
 * Returns scans array, pagination metadata, and usage object.
 *
 * @param userId - User ID to fetch files for
 * @param options - Optional parameters for pagination, filtering, and sorting
 * @returns Promise with storage files data including pagination info
 */
export async function getUserStorageFiles(
  userId: string,
  options?: {
    search?: string;
    sortBy?: "uploaded_at" | "file_name" | "file_size_mb";
    sortDir?: "asc" | "desc";
    page?: number;
    limit?: number;
  },
) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const {
    search = null,
    sortBy = "uploaded_at",
    sortDir = "desc",
    page = 1,
    limit = 10,
  } = options || {};

  // Calculate offset from page number
  const offset = (page - 1) * limit;

  const { data, error } = await supabaseAdmin.rpc("get_user_storage_files", {
    input_user_id: userId,
    search_query: search || null,
    sort_by: sortBy,
    sort_dir: sortDir,
    page_limit: limit,
    page_offset: offset,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Gets all scans (files) for a specific mailroom registration.
 * Returns scans with related mailbox item data and storage usage information.
 *
 * Used in:
 * - app/api/user/scans/route.ts - API endpoint for user scans
 */
export async function getUserScans(
  registrationId: string,
  userId: string,
): Promise<{
  scans: unknown[];
  usage: {
    used_mb: number;
    limit_mb: number;
    percentage: number;
  };
}> {
  if (!registrationId) {
    throw new Error("registrationId is required");
  }
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc("get_registration_scans", {
    input_data: {
      registration_id: registrationId,
      user_id: userId,
    },
  });

  if (error) {
    throw error;
  }

  return data as {
    scans: unknown[];
    usage: {
      used_mb: number;
      limit_mb: number;
      percentage: number;
    };
  };
}

/**
 * Gets all assigned lockers for admin via RPC.
 * Used in:
 * - app/api/admin/mailroom/assigned-lockers/route.ts - API endpoint for admin assigned lockers
 */
export async function adminGetAssignedLockers() {
  const { data, error } = await supabaseAdmin.rpc("admin_get_assigned_lockers");

  if (error) {
    throw error;
  }

  return data;
}

export async function checkEmailExistsAction(email: string): Promise<boolean> {
  if (!email) {
    throw new Error("Email is required");
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("check_email_exists", {
      p_email: email,
    });

    if (error) {
      console.error("Supabase RPC error in checkEmailExistsAction:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return !!data;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Gets payment transactions with pagination, sorting, filtering, and search capabilities.
 * Supports both customer view (filtered by user_ids) and admin view (all transactions when user_ids is NULL).
 * Search works across payment_transaction_reference_id, payment_transaction_reference, and payment_transaction_order_id fields.
 * Sorting supports payment_transaction_date, payment_transaction_created_at, and payment_transaction_updated_at fields.
 *
 * Used in:
 * - app/api/user/transactions/route.ts - API endpoint for user transactions
 * - app/api/admin/transactions/route.ts - API endpoint for admin transactions
 *
 * @param options - Optional parameters for filtering, pagination, sorting, and search
 * @returns Promise with transactions array and pagination metadata
 */
export async function getTransactions(options?: {
  userIds?: string[] | null;
  search?: string | null;
  sortBy?:
    | "payment_transaction_date"
    | "payment_transaction_created_at"
    | "payment_transaction_updated_at";
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
  include_user_details?: boolean;
}): Promise<{
  transactions: T_RawTransaction[];
  pagination: T_TransactionPaginationMeta;
  stats: T_TransactionStats;
}> {
  const {
    userIds = null,
    search = null,
    sortBy = "payment_transaction_date",
    sortDir = "desc",
    page = 1,
    limit = 10,
    include_user_details = true,
  } = options || {};

  // Validate and sanitize inputs
  const validSortBy =
    sortBy &&
    [
      "payment_transaction_date",
      "payment_transaction_created_at",
      "payment_transaction_updated_at",
    ].includes(sortBy)
      ? sortBy
      : "payment_transaction_date";
  const validSortDir =
    sortDir && ["asc", "desc"].includes(sortDir) ? sortDir : "desc";
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
  const validOffset = (validPage - 1) * validLimit;

  // Convert userIds string array to UUID array if provided
  let userIdsArray: string[] | null = null;
  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserIds = userIds.filter((id) => {
      if (!uuidRegex.test(id)) {
        console.warn(`Invalid userId format: ${id}`);
        return false;
      }
      return true;
    });
    userIdsArray = validUserIds.length > 0 ? validUserIds : null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("get_transactions", {
      input_user_ids: userIdsArray,
      search_query: search || null,
      sort_by: validSortBy,
      sort_dir: validSortDir,
      page_limit: validLimit,
      page_offset: validOffset,
      include_user_details: include_user_details,
    });

    if (error) {
      console.error("Supabase RPC error in getTransactions:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      return {
        transactions: [],
        pagination: {
          total: 0,
          limit: validLimit,
          offset: validOffset,
          has_more: false,
        },
        stats: {
          total_revenue: 0,
          total_transactions: 0,
          successful_transactions: 0,
          avg_transaction: 0,
        },
      };
    }

    // Parse data if it's a string, otherwise use as is
    let payload: unknown;
    try {
      payload = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.error("Failed to parse RPC response:", {
        data,
        parseError,
      });
      throw new Error("Failed to parse transactions response");
    }

    if (!payload || typeof payload !== "object") {
      console.error("Invalid payload structure:", { payload });
      return {
        transactions: [],
        pagination: {
          total: 0,
          limit: validLimit,
          offset: validOffset,
          has_more: false,
        },
        stats: {
          total_revenue: 0,
          total_transactions: 0,
          successful_transactions: 0,
          avg_transaction: 0,
        },
      };
    }

    const payloadRecord = payload as Record<string, unknown>;
    const transactionsArray = Array.isArray(payloadRecord.transactions)
      ? payloadRecord.transactions
      : [];
    const paginationData = payloadRecord.pagination as {
      total?: number;
      limit?: number;
      offset?: number;
      has_more?: boolean;
    } | null;
    const statsData = payloadRecord.stats as {
      total_revenue?: number;
      total_transactions?: number;
      successful_transactions?: number;
      avg_transaction?: number;
    } | null;

    return {
      transactions: transactionsArray,
      pagination: {
        total: paginationData?.total ?? 0,
        limit: paginationData?.limit ?? validLimit,
        offset: paginationData?.offset ?? validOffset,
        has_more: paginationData?.has_more ?? false,
      },
      stats: {
        total_revenue: statsData?.total_revenue ?? 0,
        total_transactions: statsData?.total_transactions ?? 0,
        successful_transactions: statsData?.successful_transactions ?? 0,
        avg_transaction: statsData?.avg_transaction ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

export const getRegion = async () => {
  const { data, error } = await supabaseAdmin
    .schema("address_schema")
    .from("region_table")
    .select("region_id, region")
    .eq("region_is_disabled", false)
    .eq("region_is_available", true);
  if (error) throw error;

  return data as RegionTableRow[];
};

export const getProvince = async (params: { regionId: string }) => {
  const { regionId } = params;

  const { data, error } = await supabaseAdmin
    .schema("address_schema")
    .from("province_table")
    .select("province_id, province")
    .eq("province_is_disabled", false)
    .eq("province_is_available", true)
    .eq("province_region_id", regionId);
  if (error) throw error;

  return data as ProvinceTableRow[];
};

export const getCity = async (params: { provinceId: string }) => {
  const { provinceId } = params;

  const { data, error } = await supabaseAdmin
    .schema("address_schema")
    .from("city_table")
    .select("city_id, city")
    .eq("city_is_disabled", false)
    .eq("city_is_available", true)
    .eq("city_province_id", provinceId);
  if (error) throw error;

  return data as CityTableRow[];
};

export const getBarangay = async (params: { cityId: string }) => {
  const { cityId } = params;

  const { data, error } = await supabaseAdmin
    .schema("address_schema")
    .from("barangay_table")
    .select("barangay_id, barangay, barangay_zip_code")
    .eq("barangay_is_disabled", false)
    .eq("barangay_is_available", true)
    .eq("barangay_city_id", cityId);
  if (error) throw error;

  return data as BarangayTableRow[];
};

export async function adminListUsers(args: {
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  direction?: "asc" | "desc";
  role?: string;
}): Promise<{ data: AdminUsersRpcResult["data"]; total_count: number }> {
  const {
    search = "",
    limit = 10,
    offset = 0,
    sort = "users_created_at",
    direction = "desc",
    role = "",
  } = args;

  const { data, error } = await supabaseAdmin.rpc("admin_list_users", {
    input_search: search,
    input_limit: limit,
    input_offset: offset,
    input_sort: sort,
    input_direction: direction,
    input_role: role,
  });

  if (error) throw error;

  const payload =
    typeof data === "string" ? JSON.parse(data) : (data as unknown);

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !("total_count" in payload)
  ) {
    return { data: [], total_count: 0 };
  }

  const result = payload as AdminUsersRpcResult;

  return {
    data: Array.isArray(result.data) ? result.data : [],
    total_count: Number(result.total_count) || 0,
  };
}
