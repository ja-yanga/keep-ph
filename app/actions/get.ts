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
  RewardsStatusResult,
  RpcAdminClaim,
  RpcClaim,
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
 * Gets all mailroom plans.
 * Returns an array of mailroom plans with pricing and capabilities.
 *
 * Used in:
 * - app/api/plans/route.ts - API endpoint for plans
 * - app/mailroom/register/page.tsx - Server component to fetch plans (via API)
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
    const { data, error } = await supabaseAdmin
      .from("mailroom_plan_table")
      .select("*")
      .order("mailroom_plan_price", { ascending: true });

    if (error) {
      console.error("Error fetching mailroom plans:", {
        error,
        code: error.code,
        message: error.message,
      });
      throw new Error(
        `Database error: ${error.message || "Unknown error"}${error.code ? ` (${error.code})` : ""}`,
      );
    }

    return (
      data?.map((plan) => ({
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
    const { data, error } = await supabaseAdmin
      .from("mailroom_location_table")
      .select(
        "mailroom_location_id, mailroom_location_name, mailroom_location_region, mailroom_location_city, mailroom_location_barangay, mailroom_location_zip",
      )
      .order("mailroom_location_name", { ascending: true });

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

    return (
      data?.map((loc) => ({
        id: loc.mailroom_location_id,
        name: loc.mailroom_location_name,
        region: loc.mailroom_location_region,
        city: loc.mailroom_location_city,
        barangay: loc.mailroom_location_barangay,
        zip: loc.mailroom_location_zip,
      })) ?? []
    );
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
    const { data, error } = await supabaseAdmin
      .from("location_locker_table")
      .select("mailroom_location_id")
      .eq("location_locker_is_available", true);

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

    // Count available lockers per location
    const counts: Record<string, number> = {};
    if (data) {
      for (const row of data) {
        const locId = row.mailroom_location_id;
        if (locId) {
          counts[locId] = (counts[locId] || 0) + 1;
        }
      }
    }

    return counts;
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

    // Look up by payment transaction order_id
    // Use limit(1) to handle potential duplicates gracefully and avoid PGRST116
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("payment_transaction_table")
      .select("mailroom_registration_id")
      .eq("payment_transaction_order_id", orderId)
      .order("payment_transaction_created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "[getMailroomRegistrationByOrder] payment lookup error:",
        paymentError,
      );
      throw new Error(
        `Database error: ${paymentError.message || "Unknown error"}`,
      );
    }

    if (!paymentData?.mailroom_registration_id) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("mailroom_registration_table")
      .select("*")
      .eq("mailroom_registration_id", paymentData.mailroom_registration_id)
      .maybeSingle();

    if (error) {
      console.error(
        "[getMailroomRegistrationByOrder] registration lookup error:",
        error,
      );
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
    // Fetch Plan Price
    const { data: plan, error: planError } = await supabaseAdmin
      .from("mailroom_plan_table")
      .select("mailroom_plan_price")
      .eq("mailroom_plan_id", planId)
      .single();

    if (planError || !plan) {
      throw new Error("Invalid plan selected");
    }

    // Calculate base amount
    let amountDue =
      Number(plan.mailroom_plan_price) * Number(lockerQty) * Number(months);

    // Apply yearly discount
    if (Number(months) === 12) {
      amountDue = amountDue * 0.8;
    }

    // Apply referral discount
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from("users_table")
        .select("users_id")
        .eq("users_referral_code", referralCode)
        .single();

      if (referrer) {
        amountDue = amountDue * 0.95;
      }
    }

    return amountDue;
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
    const { data: availableLockers, error: lockerCheckError } =
      await supabaseAdmin
        .from("location_locker_table")
        .select("location_locker_id")
        .eq("mailroom_location_id", locationId)
        .eq("location_locker_is_available", true)
        .limit(lockerQty);

    if (lockerCheckError) {
      throw new Error("Failed to check locker availability");
    }

    const count = availableLockers?.length ?? 0;
    return {
      available: count >= lockerQty,
      count,
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

export async function getUserMailroomRegistrationStats(userId: string): Promise<
  Array<{
    mailroom_registration_id: string;
    stored: number;
    pending: number;
    released: number;
  }>
> {
  if (!userId) return [];
  const { data, error } = await supabaseAdmin.rpc(
    "get_user_mailroom_registration_stats",
    { input_user_id: userId },
  );
  if (error) throw error;
  return parseRpcArray<{
    mailroom_registration_id: string;
    stored: number;
    pending: number;
    released: number;
  }>(data);
}

export async function getAllMailRoomLocation() {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_list_mailroom_locations",
  );

  if (error) throw error;
  return data;
}
