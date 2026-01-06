"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { parseAddressRow } from "@/utils/helper";
import {
  AdminCreateMailroomLocationArgs,
  CreateUserAddressArgs,
  LocationRow,
  RequestRewardClaimArgs,
  RpcClaimResponse,
  UpdateUserAddressArgs,
  UserAddressRow,
} from "@/utils/types";

const supabase = createSupabaseServiceClient();

export async function getUserKYC(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase.rpc("get_user_kyc_by_user_id", {
    input_user_id: userId,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}

export async function submitKYC(formData: FormData, userId: string) {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const document_type = String(formData.get("document_type") ?? "");
  const document_number = String(formData.get("user_kyc_id_number") ?? "");
  const first_name = String(formData.get("first_name") ?? "");
  const last_name = String(formData.get("last_name") ?? "");
  const address_line1 = String(formData.get("address_line1") ?? "");
  const address_line2 = String(formData.get("address_line2") ?? "");
  const city = String(formData.get("city") ?? "");
  const region = String(formData.get("region") ?? "");
  const postal = String(formData.get("postal") ?? "");
  const birth_date = String(formData.get("birth_date") ?? "");

  const front = formData.get("front") as File | null;
  const back = formData.get("back") as File | null;

  if (!document_type || !document_number || !front || !back) {
    throw new Error(
      "document_type, document_number, front and back files are required",
    );
  }

  // basic file size guard (10 MB)
  const MAX_BYTES = 10 * 1024 * 1024;
  if ((front.size ?? 0) > MAX_BYTES || (back.size ?? 0) > MAX_BYTES) {
    throw new Error("Files must be <= 10MB");
  }

  const bucket = "USER-KYC-DOCUMENTS"; // ensure this bucket exists in Supabase storage
  const ts = Date.now();
  const frontName = `${userId}/front-${ts}-${(front as File).name ?? "front"}`;
  const backName = `${userId}/back-${ts}-${(back as File).name ?? "back"}`;

  const frontBuffer = Buffer.from(await front.arrayBuffer());
  const backBuffer = Buffer.from(await back.arrayBuffer());

  const { error: fe } = await supabase.storage
    .from(bucket)
    .upload(frontName, frontBuffer, {
      contentType: front.type,
      upsert: true,
    });
  if (fe) throw fe;

  const { error: be } = await supabase.storage
    .from(bucket)
    .upload(backName, backBuffer, {
      contentType: back.type,
      upsert: true,
    });
  if (be) throw be;

  const { data: frontUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(frontName);
  const { data: backUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(backName);
  const id_front_url = frontUrlData?.publicUrl ?? "";
  const id_back_url = backUrlData?.publicUrl ?? "";

  const { error: upErr } = await supabase.rpc("user_submit_kyc", {
    input_data: {
      user_id: userId,
      document_type,
      id_front_url,
      id_back_url,
      user_kyc_id_number: document_number,
      first_name,
      last_name,
      birth_date: birth_date || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      region: region || null,
      postal: postal || null,
    },
  });

  // also store the submitted address in user's saved addresses and mark it as default
  // only attempt when address_line1 is present
  if (!upErr && address_line1) {
    try {
      // check if user already has a default address
      const { data: existingDefaults, error: defErr } = await supabase
        .from("user_address_table")
        .select("user_address_id")
        .eq("user_id", userId)
        .eq("user_address_is_default", true)
        .limit(1);

      let isDefault = true;
      if (defErr) {
        // don't block KYC flow on this check
        console.warn("Failed to check existing default address:", defErr);
      } else if (
        Array.isArray(existingDefaults) &&
        existingDefaults.length > 0
      ) {
        isDefault = false;
      }

      await supabase.from("user_address_table").insert([
        {
          user_id: userId,
          user_address_label: "KYC address",
          user_address_line1: address_line1,
          user_address_line2: address_line2 || null,
          user_address_city: city || null,
          user_address_region: region || null,
          user_address_postal: postal || null,
          user_address_is_default: isDefault,
        },
      ]);
    } catch (e) {
      // non-fatal: log and continue (RPC already succeeded)
      console.warn("Failed to save user address from KYC:", e);
    }
  }

  if (upErr) throw upErr;

  return { ok: true, status: "SUBMITTED" };
}

export async function createUserAddress(
  args: CreateUserAddressArgs,
): Promise<UserAddressRow> {
  const { user_id, line1, label, line2, city, region, postal, is_default } =
    args;

  if (!user_id || !line1) {
    throw new Error("user_id and line1 are required");
  }

  const { data, error } = await supabase.rpc("user_create_address", {
    input_user_id: user_id,
    input_line1: line1,
    input_label: label ?? null,
    input_line2: line2 ?? null,
    input_city: city ?? null,
    input_region: region ?? null,
    input_postal: postal ?? null,
    input_is_default: !!is_default,
  });

  if (error) {
    throw error;
  }

  const addressRow = parseAddressRow(data);

  // Log activity
  await logActivity({
    userId: user_id,
    action: "CREATE",
    type: "USER_UPDATE_PROFILE",
    entityType: "USER_ADDRESS",
    entityId: addressRow.user_address_id,
    details: {
      user_address_id: addressRow.user_address_id,
      label,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    },
  });

  return addressRow;
}

export async function updateUserAddress(
  args: UpdateUserAddressArgs,
): Promise<UserAddressRow> {
  const { address_id, line1, label, line2, city, region, postal, is_default } =
    args;

  if (!address_id || !line1) {
    throw new Error("address_id and line1 are required");
  }

  const { data, error } = await supabase.rpc("user_update_address", {
    input_user_address_id: address_id,
    input_line1: line1,
    input_label: label ?? null,
    input_line2: line2 ?? null,
    input_city: city ?? null,
    input_region: region ?? null,
    input_postal: postal ?? null,
    input_is_default: !!is_default,
  });

  if (error) {
    throw error;
  }

  return parseAddressRow(data);
}

export async function deleteUserAddress(addressId: string): Promise<boolean> {
  if (!addressId) {
    throw new Error("addressId is required");
  }

  const { data, error } = await supabase.rpc("user_delete_address", {
    input_user_address_id: addressId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export const requestRewardClaim = async ({
  userId,
  paymentMethod,
  accountDetails,
}: RequestRewardClaimArgs): Promise<RpcClaimResponse | null> => {
  const { data, error } = await supabase.rpc("request_reward_claim", {
    input_user_id: userId,
    input_payment_method: paymentMethod,
    input_account_details: accountDetails,
  });

  if (error) throw error;
  return data as RpcClaimResponse | null;
};

/**
 * Finalizes mailroom registration from payment webhook.
 * Uses the finalize_registration_from_payment RPC function.
 */
export async function finalizeRegistrationFromPayment(args: {
  paymentId: string;
  orderId: string;
  userId: string;
  locationId: string;
  planId: string;
  lockerQty: number;
  months: number;
  amount: number;
}) {
  const { data, error } = await supabase.rpc(
    "finalize_registration_from_payment",
    {
      input_data: {
        payment_id: args.paymentId,
        order_id: args.orderId,
        user_id: args.userId,
        location_id: args.locationId,
        plan_id: args.planId,
        locker_qty: args.lockerQty,
        months: args.months,
        amount: args.amount,
      },
    },
  );

  if (error) {
    throw error;
  }

  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Creates a mailroom registration with locker assignments.
 */
export async function createMailroomRegistration({
  userId,
  locationId,
  planId,
  lockerQty,
}: {
  userId: string;
  locationId: string;
  planId: string;
  lockerQty: number;
}): Promise<{
  registration: unknown;
  lockerIds: string[];
}> {
  try {
    // Generate unique mailroom code
    const mailroomCode = await generateMailroomCode();

    const { data, error } = await supabase.rpc("create_mailroom_registration", {
      input_data: {
        user_id: userId,
        location_id: locationId,
        plan_id: planId,
        locker_qty: lockerQty,
        mailroom_code: mailroomCode,
      },
    });

    if (error) {
      throw error;
    }

    const payload = typeof data === "string" ? JSON.parse(data) : data;
    const { registration, lockerIds } = payload;

    // Log activity
    const regData = payload.registration as Record<string, unknown>;
    await logActivity({
      userId,
      action: "CREATE",
      type: "USER_REQUEST_OTHERS",
      entityType: "MAILROOM_REGISTRATION",
      entityId: regData.mailroom_registration_id as string,
      details: {
        mailroom_registration_id: regData.mailroom_registration_id,
        mailroom_registration_code: mailroomCode,
        mailroom_location_id: locationId,
        mailroom_plan_id: planId,
        locker_count: lockerQty,
        locker_ids: payload.lockerIds,
      },
    });

    return {
      registration,
      lockerIds,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Adds a new referral record using the referral_add RPC.
 */
export async function addReferral(args: {
  userId?: string;
  referralCode?: string;
  referredEmail: string;
  serviceType: string;
}) {
  const { data, error } = await supabase.rpc("referral_add", {
    input_data: {
      user_id: args.userId,
      referral_code: args.referralCode,
      referred_email: args.referredEmail,
      service_type: args.serviceType,
    },
  });

  if (error) throw error;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Generates or retrieves a referral code using the referral_generate RPC.
 */
export async function generateReferralCode(userId: string) {
  const { data, error } = await supabase.rpc("referral_generate", {
    input_data: { user_id: userId },
  });

  if (error) throw error;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Validates a referral code using the referral_validate RPC.
 */
export async function validateReferralCode(args: {
  code: string;
  currentUserId?: string;
}) {
  const { data, error } = await supabase.rpc("referral_validate", {
    input_data: {
      code: args.code,
      current_user_id: args.currentUserId,
    },
  });

  if (error) throw error;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Lists referrals for a user using the referral_list RPC.
 */
export async function listReferrals(userId: string) {
  const { data, error } = await supabase.rpc("referral_list", {
    input_data: { user_id: userId },
  });

  if (error) throw error;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Creates a mailroom location for admin.
 */
export async function adminCreateMailroomLocation(
  args: AdminCreateMailroomLocationArgs & { userId?: string },
): Promise<LocationRow> {
  const payload = {
    input_name: args.name,
    input_code: args.code ?? null,
    input_region: args.region ?? null,
    input_city: args.city ?? null,
    input_barangay: args.barangay ?? null,
    input_zip: args.zip ?? null,
    input_total_lockers: args.total_lockers ?? 0,
  };

  const { data, error } = await supabase.rpc(
    "admin_create_mailroom_location",
    payload,
  );

  if (error) {
    throw error;
  }

  const row =
    typeof data === "string" ? (JSON.parse(data) as LocationRow) : data;

  // Log activity if userId provided
  if (args.userId) {
    await logActivity({
      userId: args.userId,
      action: "CREATE",
      type: "ADMIN_ACTION",
      entityType: undefined,
      entityId: (row as Record<string, unknown>).mailroom_location_id as string,
      details: {
        mailroom_location_id: (row as Record<string, unknown>)
          .mailroom_location_id,
        name: args.name,
        code: args.code,
        region: args.region,
        city: args.city,
        barangay: args.barangay,
        zip: args.zip,
        total_lockers: args.total_lockers,
      },
    });
  }

  return row as LocationRow;
}

/**
 * Generates a unique mailroom registration code via RPC.
 */
async function generateMailroomCode(): Promise<string> {
  const { data, error } = await supabase.rpc(
    "generate_mailroom_registration_code",
  );

  if (error) {
    throw error;
  }

  const result = data as { code: string };
  return result.code;
}

/**
 * Creates a mailroom package (mailbox item) for admin via RPC.
 * Used in:
 * - app/api/admin/mailroom/packages/route.ts - API endpoint for creating packages
 */
export async function adminCreateMailroomPackage(args: {
  userId: string;
  package_name: string;
  registration_id: string;
  locker_id?: string | null;
  package_type: "Document" | "Parcel";
  status: string;
  notes?: string | null;
  package_photo?: string | null;
  locker_status?: string;
}): Promise<unknown> {
  const supabaseAdmin = createSupabaseServiceClient();

  // Insert package into mailbox_item_table
  const { data, error } = await supabaseAdmin
    .from("mailbox_item_table")
    .insert({
      mailbox_item_name: args.package_name,
      mailroom_registration_id: args.registration_id,
      location_locker_id: args.locker_id || null,
      mailbox_item_type: args.package_type,
      mailbox_item_status: args.status,
      mailbox_item_photo: args.package_photo ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update locker status if provided
  if (args.locker_id && args.locker_status) {
    const { error: lockerError } = await supabaseAdmin
      .from("mailroom_assigned_locker_table")
      .update({ mailroom_assigned_locker_status: args.locker_status })
      .eq("location_locker_id", args.locker_id)
      .eq("mailroom_registration_id", args.registration_id);

    if (lockerError) {
      console.error("Failed to update locker status:", lockerError);
      // Don't throw - allow package creation to succeed even if locker update fails
    }
  }

  // Send notification
  const { data: registration } = await supabaseAdmin
    .from("mailroom_registration_table")
    .select("user_id, mailroom_registration_code")
    .eq("mailroom_registration_id", args.registration_id)
    .single();

  if (registration) {
    const regData = registration as Record<string, unknown>;
    const userId = regData.user_id as string;
    const code = (regData.mailroom_registration_code as string) || "Unknown";

    await sendNotification(
      userId,
      "Package Arrived",
      `A new ${args.package_type} (${args.package_name}) has arrived at Mailroom ${code}.`,
      "PACKAGE_ARRIVED",
      `/mailroom/${args.registration_id}`,
    );
  }

  // Log activity
  const packageData = data as Record<string, unknown>;
  await logActivity({
    userId: args.userId,
    action: "CREATE",
    type: "ADMIN_ACTION",
    entityType: "MAILBOX_ITEM",
    entityId: packageData.mailbox_item_id as string,
    details: {
      package_name: args.package_name,
      registration_id: args.registration_id,
      locker_id: args.locker_id,
      package_type: args.package_type,
      status: args.status,
      mailbox_item_id: packageData.mailbox_item_id,
    },
  });

  return data;
}

export async function upsertPaymentResource(payRes: {
  id?: string;
  attributes?: {
    source?: { id?: string };
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      order_id?: string;
      user_id?: string;
      location_id?: string;
      plan_id?: string;
      locker_qty?: number;
      months?: number;
    };
  };
}) {
  const payId = payRes?.id;
  const attrs = payRes?.attributes ?? {};
  const meta = attrs?.metadata ?? {};
  const orderId = meta?.order_id ?? null;

  if (!orderId) {
    console.debug("[webhook] processing skipped: no order_id");
    return { id: payId, orderId: null };
  }

  // Validate required metadata fields for mailroom registration
  const userId = meta.user_id?.trim() || null;
  const locationId = meta.location_id?.trim() || null;
  const planId = meta.plan_id?.trim() || null;

  // Check if this is a mailroom registration (has required fields)
  const isMailroomRegistration = userId && locationId && planId;

  if (!isMailroomRegistration) {
    console.debug(
      "[webhook] processing skipped: missing required registration metadata",
      {
        orderId,
        hasUserId: !!userId,
        hasLocationId: !!locationId,
        hasPlanId: !!planId,
      },
    );
    return { id: payId, orderId, skipped: true };
  }

  // Log payment for debugging
  console.debug("[webhook] processing payment resource:", {
    id: payId,
    orderId,
    status: attrs?.status,
    amount: attrs?.amount,
  });

  try {
    await finalizeRegistrationFromPayment({
      paymentId: payId ?? "",
      orderId: orderId,
      userId: userId,
      locationId: locationId,
      planId: planId,
      lockerQty: Math.max(1, Number(meta.locker_qty ?? 1)),
      months: Math.max(1, Number(meta.months ?? 1)),
      amount: Number(attrs?.amount ?? 0),
    });
  } catch (finalErr) {
    console.error("[webhook] finalizeRegistrationFromPayment error:", finalErr);
    throw finalErr;
  }

  return { id: payId, orderId };
}

/**
 * Creates a new locker assignment for admin via RPC.
 * Used in:
 * - app/api/admin/mailroom/assigned-lockers/route.ts - API endpoint for admin assigned lockers
 */
export async function adminCreateAssignedLocker(args: {
  registration_id: string;
  locker_id: string;
}) {
  const { data, error } = await supabase.rpc("admin_create_assigned_locker", {
    input_data: {
      registration_id: args.registration_id,
      locker_id: args.locker_id,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
