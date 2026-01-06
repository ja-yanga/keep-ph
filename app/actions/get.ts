import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  normalizeAdminClaim,
  normalizeClaim,
  toBoolean,
  toNumber,
} from "@/utils/helper";
import {
  AdminClaim,
  AdminDashboardStats,
  AdminUserKyc,
  ClaimWithUrl,
  MailroomPlanRow,
  MailroomRegistrationStats,
  RegCounts,
  RewardsStatusResult,
  RpcAdminClaim,
  RpcClaim,
  RpcMailroomPlan,
  UserAddressRow,
} from "@/utils/types";

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
        threshold: 10,
        amount: 500,
        referralCount: 0,
        eligible: false,
        hasClaim: false,
        claims: [],
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
      threshold: toNumber(payloadRecord.threshold, 10),
      amount: toNumber(payloadRecord.amount, 500),
      referralCount: toNumber(payloadRecord.referralCount, 0),
      eligible: toBoolean(payloadRecord.eligible),
      hasClaim: toBoolean(payloadRecord.hasClaim),
      claims: claimsWithUrls,
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
): Promise<unknown[]> {
  if (!userId) {
    return [];
  }

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
      return [];
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

    // Ensure it's an array
    if (!Array.isArray(payload)) {
      console.error("Invalid payload structure:", { payload, userId });
      return [];
    }

    return payload;
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
): Promise<AdminUserKyc[]> {
  const { data, error } = await supabaseAdmin.rpc("admin_list_user_kyc", {
    input_search: search,
    input_limit: limit,
  });

  if (error) {
    throw error;
  }

  const parsed =
    typeof data === "string"
      ? (JSON.parse(data) as unknown[])
      : ((data as unknown[]) ?? []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as AdminUserKyc[];
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
}): Promise<{
  packages: unknown[];
  registrations: unknown[];
  lockers: unknown[];
  assignedLockers: unknown[];
  totalCount: number;
}> {
  const limit = Math.min(args.limit ?? 50, 200);
  const offset = args.offset ?? 0;
  const compact = args.compact ?? false;

  const { data, error } = await supabaseAdmin.rpc(
    "get_admin_mailroom_packages",
    {
      input_limit: limit,
      input_offset: offset,
      input_compact: compact,
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

  return {
    packages,
    registrations,
    lockers,
    assignedLockers,
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

export async function getMailroomRegistrationsWithStats(userId: string) {
  if (!userId) return { data: [], stats: null };

  try {
    // 1. Get Registrations
    const registrations = (await getMailroomRegistrations(userId)) as Record<
      string,
      unknown
    >[];

    // 2. Get Overall Stats
    let totals: Record<string, unknown> | null = null;
    try {
      totals = await getUserMailroomStats(userId);
    } catch (e) {
      console.error("Failed to get user mailroom stats:", e);
    }

    // 3. Get Per-Registration Stats
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
      // Fallback: build counts from mailbox_item_table
      const regIds = registrations
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
    const results = registrations.map((r) => {
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
export async function getNotificationByUserId(userId: string) {
  if (!userId) return [];

  const { data, error } = await supabaseAdmin.rpc("get_user_notifications", {
    input_user_id: userId,
    input_limit: 10,
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
 * Gets user storage files and usage stats via RPC.
 * Returns scans array and usage object.
 */
export async function getUserStorageFiles(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc("get_user_storage_files", {
    input_user_id: userId,
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
