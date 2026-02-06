"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { parseAddressRow } from "@/utils/helper";
import {
  AdminCreateMailroomLocationArgs,
  AdminCreateMailroomPackageArgs,
  AdminIpWhitelistEntry,
  AdminMailroomLocation,
  AdminMailroomPackage,
  CreateUserAddressArgs,
  RequestRewardClaimArgs,
  RpcClaimResponse,
  T_LocationLockerInsert,
  T_LocationLockerUpdate,
  UpdateUserAddressArgs,
  UserAddressRow,
} from "@/utils/types";

const supabase = createSupabaseServiceClient();

export async function adminCreateIpWhitelist(args: {
  ipCidr: string;
  description?: string | null;
  createdBy?: string | null;
}): Promise<AdminIpWhitelistEntry> {
  const { data, error } = await supabase.rpc("admin_create_ip_whitelist", {
    input_ip_cidr: args.ipCidr,
    input_description: args.description ?? null,
    input_created_by: args.createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AdminIpWhitelistEntry;
    } catch {
      throw new Error("Failed to parse IP whitelist response");
    }
  }

  return data as AdminIpWhitelistEntry;
}

export async function getUserKYC(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase.rpc(
    "get_user_kyc_with_populated_user",
    {
      input_user_id: userId,
    },
  );

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
  const province = String(formData.get("province") ?? "");
  const region = String(formData.get("region") ?? "");
  const barangay = String(formData.get("barangay") ?? "");
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

  // read both files in parallel to save time
  const [frontArrBuf, backArrBuf] = await Promise.all([
    front.arrayBuffer(),
    back.arrayBuffer(),
  ]);
  const frontBuffer = Buffer.from(frontArrBuf);
  const backBuffer = Buffer.from(backArrBuf);

  // upload both files in parallel
  const [feResult, beResult] = await Promise.all([
    supabase.storage.from(bucket).upload(frontName, frontBuffer, {
      contentType: front.type,
      upsert: true,
    }),
    supabase.storage.from(bucket).upload(backName, backBuffer, {
      contentType: back.type,
      upsert: true,
    }),
  ]);

  const fe = feResult.error;
  const be = beResult.error;

  if (fe) throw fe;
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
      province: province || null,
      region: region || null,
      barangay: barangay || null,
      postal: postal || null,
    },
  });

  if (!upErr) {
    await logActivity({
      userId,
      action: "SUBMIT",
      type: "USER_KYC_SUBMIT",
      entityType: "USER_KYC",
      entityId: userId,
      details: {
        kyc_description: `${first_name} ${last_name} submitted KYC`,
      },
    });
  }

  // store the submitted address in user's saved addresses and mark it as default
  // run in background (do not block response)
  if (!upErr && address_line1) {
    (async () => {
      try {
        const { data: existingDefaults, error: defErr } = await supabase
          .from("user_address_table")
          .select("user_address_id")
          .eq("user_id", userId)
          .eq("user_address_is_default", true)
          .limit(1);

        let isDefault = true;
        if (defErr) {
          // non-fatal
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
            user_address_province: province || null,
            user_address_region: region || null,
            user_address_barangay: barangay || null,
            user_address_postal: postal || null,
            user_address_is_default: isDefault,
          },
        ]);
      } catch (e) {
        console.warn("Failed to save user address from KYC:", e);
      }
    })();
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
  referral_code?: string;
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
        referral_code: args.referral_code || null,
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
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("referral_list", {
      input_data: { user_id: userId },
    });

    if (error) throw error;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (err) {
    console.error("[listReferrals] error:", err);
    throw err;
  }
}

/**
 * Creates a mailroom location for admin.
 */
export async function adminCreateMailroomLocation(
  args: AdminCreateMailroomLocationArgs & { userId?: string },
): Promise<AdminMailroomLocation> {
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
    typeof data === "string"
      ? (JSON.parse(data) as AdminMailroomLocation)
      : (data as AdminMailroomLocation);

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

  return row;
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
export async function adminCreateMailroomPackage(
  args: AdminCreateMailroomPackageArgs,
): Promise<AdminMailroomPackage> {
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
    .select(
      `
      *,
      mailroom_file_table (*)
    `,
    )
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

  // Fetch locker code if locker_id is provided
  let locker_code: string | null = null;
  if (args.locker_id) {
    const { data: lockerData } = await supabaseAdmin
      .from("location_locker_table")
      .select("location_locker_code")
      .eq("location_locker_id", args.locker_id)
      .single();
    locker_code = lockerData?.location_locker_code || null;
  }

  await logActivity({
    userId: args.userId,
    action: "STORE",
    type: "ADMIN_ACTION",
    entityType: "MAILBOX_ITEM",
    entityId: packageData.mailbox_item_id as string,
    details: {
      package_status: args.status,
      package_name: args.package_name,
      package_type: args.package_type,
      ...(locker_code && { package_locker_code: locker_code }),
    },
  });

  return data as AdminMailroomPackage;
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
      referral_code?: string;
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
      referral_code: meta.referral_code?.trim() || undefined,
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

/**
 * Releases a mailroom package with proof of release.
 * Used in:
 * - app/api/admin/mailroom/release/route.ts - API endpoint for releasing packages
 */
export async function adminReleaseMailroomPackage(args: {
  file: File;
  packageId: string;
  lockerStatus?: string | null;
  notes?: string | null;
  selectedAddressId?: string | null;
  releaseToName?: string | null;
  actorUserId?: string | null;
}): Promise<{ success: boolean }> {
  const supabaseAdmin = createSupabaseServiceClient();

  const {
    packageId,
    file,
    lockerStatus,
    selectedAddressId,
    releaseToName,
    actorUserId,
  } = args;

  if (!file || !packageId) {
    throw new Error("File and package ID are required");
  }

  // Fetch package to get registration_id for address validation & notification
  const { data: pkgRow, error: pkgRowErr } = await supabaseAdmin
    .from("mailbox_item_table")
    .select("mailbox_item_id, mailroom_registration_id, mailbox_item_name")
    .eq("mailbox_item_id", packageId.trim())
    .single();

  if (pkgRowErr || !pkgRow) {
    console.error("[release] Package lookup failed:", {
      packageId,
      error: pkgRowErr,
      found: !!pkgRow,
    });
    throw new Error(
      `Package not found: ${pkgRowErr?.message || "Package does not exist"}`,
    );
  }

  // Lookup registration to get the owning user_id
  const { data: registrationRow, error: registrationErr } = await supabaseAdmin
    .from("mailroom_registration_table")
    .select("mailroom_registration_id, user_id")
    .eq("mailroom_registration_id", pkgRow.mailroom_registration_id)
    .single();

  if (registrationErr || !registrationRow) {
    console.warn(
      "[release] registration not found for package",
      pkgRow.mailbox_item_id,
      pkgRow.mailroom_registration_id,
    );
  }

  // If selectedAddressId was provided, validate ownership and prepare snapshot fields
  let releaseAddressId: string | null = null;
  let releaseAddressText: string | null = null;
  let finalReleaseToName: string | null = releaseToName || null;

  if (selectedAddressId) {
    const { data: addr, error: addrErr } = await supabaseAdmin
      .from("user_address_table")
      .select(
        "user_address_id, user_id, user_address_label, user_address_contact_name, user_address_line1, user_address_line2, user_address_city, user_address_region, user_address_postal, user_address_is_default",
      )
      .eq("user_address_id", selectedAddressId)
      .single();

    if (addrErr || !addr) {
      throw new Error("Selected address not found");
    }

    // Ensure address belongs to the registration's user
    const ownerUserId = registrationRow?.user_id ?? null;
    if (ownerUserId && String(addr.user_id) !== String(ownerUserId)) {
      throw new Error("Address does not belong to this registration's user");
    }

    releaseAddressId = addr.user_address_id;
    if (!finalReleaseToName) {
      finalReleaseToName = addr.user_address_contact_name ?? null;
    }
    releaseAddressText = [
      addr.user_address_label ?? "",
      addr.user_address_line1 ?? "",
      addr.user_address_line2 ?? "",
      addr.user_address_city ?? "",
      addr.user_address_region ?? "",
      addr.user_address_postal ?? "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  const BUCKET_NAME = "MAILROOM-PROOFS";

  // Ensure bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    console.log(`Bucket ${BUCKET_NAME} not found, creating...`);
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg"],
    });
  }

  // Upload File
  const fileExt = file.name.split(".").pop();
  const fileName = `proof-${packageId}-${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  // Calculate file size in MB
  const fileSizeMb = file.size / (1024 * 1024);

  // Insert proof of release into mailroom_file_table
  const { error: fileInsertError } = await supabaseAdmin
    .from("mailroom_file_table")
    .insert({
      mailbox_item_id: packageId,
      mailroom_file_name: file.name,
      mailroom_file_url: publicUrl,
      mailroom_file_size_mb: fileSizeMb,
      mailroom_file_mime_type: file.type,
      mailroom_file_type: "RELEASED",
    });

  if (fileInsertError) {
    console.error("[release] Failed to insert mailroom file:", fileInsertError);
    // Don't throw - continue with package update
  }

  // Update Package Status and snapshot release address/name if provided
  const updatePayload: Record<string, unknown> = {
    mailbox_item_status: "RELEASED",
  };

  if (releaseAddressId) {
    updatePayload.user_address_id = releaseAddressId;
    updatePayload.mailbox_item_release_address = releaseAddressText;
  }

  const { data: pkg, error: updateError } = await supabaseAdmin
    .from("mailbox_item_table")
    .update(updatePayload)
    .eq("mailbox_item_id", packageId)
    .select("mailbox_item_id, mailroom_registration_id, mailbox_item_name")
    .single();

  if (updateError) {
    throw new Error(`Failed to update package: ${updateError.message}`);
  }

  // Log activity
  if (actorUserId) {
    try {
      // Get package type and locker info from the database
      const { data: pkgDetails } = await supabaseAdmin
        .from("mailbox_item_table")
        .select("mailbox_item_type, mailbox_item_status, location_locker_id")
        .eq("mailbox_item_id", packageId)
        .single();

      // Fetch locker code if locker exists
      let locker_code: string | null = null;
      if (pkgDetails?.location_locker_id) {
        const { data: lockerData } = await supabaseAdmin
          .from("location_locker_table")
          .select("location_locker_code")
          .eq("location_locker_id", pkgDetails.location_locker_id)
          .single();
        locker_code = lockerData?.location_locker_code || null;
      }

      await logActivity({
        userId: actorUserId,
        action: "RELEASE",
        type: "ADMIN_ACTION",
        entityType: "MAILBOX_ITEM",
        entityId: packageId,
        details: {
          status: "RELEASED",
          package_name: pkg?.mailbox_item_name,
          package_type: pkgDetails?.mailbox_item_type || "Parcel",
          ...(locker_code && { locker_code }),
        },
      });
    } catch (logErr) {
      console.error("Release activity log failed:", logErr);
    }
  }

  // Update Locker Status
  if (lockerStatus && pkg.mailroom_registration_id) {
    const { error: lockerError } = await supabaseAdmin
      .from("mailroom_assigned_locker_table")
      .update({ mailroom_assigned_locker_status: lockerStatus })
      .eq("mailroom_registration_id", pkg.mailroom_registration_id);

    if (lockerError) {
      console.error("Failed to update locker status:", lockerError);
    }
  }

  // Notify user
  if (pkg?.mailroom_registration_id) {
    try {
      const { data: registration, error: regErr } = await supabaseAdmin
        .from("mailroom_registration_table")
        .select("user_id, mailroom_registration_code")
        .eq("mailroom_registration_id", pkg.mailroom_registration_id)
        .single();

      if (regErr) {
        console.error("Failed to fetch registration for notification:", regErr);
      } else if (registration?.user_id) {
        try {
          await sendNotification(
            registration.user_id,
            "Package Released",
            `Your package (${
              pkg.mailbox_item_name || "Unknown"
            }) has been released and is ready for pickup.`,
            "PACKAGE_RELEASED",
            `/mailroom/${pkg.mailroom_registration_id}`,
          );
        } catch (notifyErr) {
          console.error("sendNotification failed for release:", notifyErr);
        }
      }
    } catch (e) {
      console.error("Notification flow failed:", e);
    }
  }

  return { success: true };
}
export const claimReferralRewards = async (
  userId: string,
  paymentMethod: string,
  accountDetails: string,
): Promise<{
  success: boolean;
  message: string;
  payout: number;
  milestones_claimed?: number;
  total_claimed_milestones?: number;
}> => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase.rpc("claim_referral_rewards", {
    input_user_id: userId,
    input_payment_method: paymentMethod,
    input_account_details: accountDetails,
  });

  if (error) {
    console.error("Supabase RPC error in claimReferralRewards:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data as {
    success: boolean;
    message: string;
    payout: number;
    milestones_claimed?: number;
    total_claimed_milestones?: number;
  };
};

export async function adminRestoreMailboxItem(id: string) {
  const { data, error } = await supabase.rpc("admin_restore_mailbox_item", {
    input_data: { id },
  });

  if (error) {
    throw error;
  }

  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function adminPermanentDeleteMailboxItem(id: string) {
  const { data, error } = await supabase.rpc(
    "admin_permanent_delete_mailbox_item",
    {
      input_data: { id },
    },
  );

  if (error) {
    throw error;
  }

  return typeof data === "string" ? JSON.parse(data) : data;
}
/**
 * Creates a new locker for admin.
 */
export async function adminCreateLocker(args: {
  locationId: string;
  lockerCode: string;
  isAvailable?: boolean;
  isAssignable?: boolean;
}): Promise<{ id: string; code: string | null }> {
  const { locationId, lockerCode, isAvailable, isAssignable = true } = args;

  if (!locationId || !lockerCode) {
    throw new Error("locationId and lockerCode are required");
  }

  const { data, error } = await supabase
    .from("location_locker_table")
    .insert([
      {
        mailroom_location_id: locationId,
        location_locker_code: lockerCode,
        location_locker_is_available: isAvailable,
        location_locker_is_assignable: isAssignable,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create locker");
  }

  const created = data as T_LocationLockerInsert;

  return {
    id: created.location_locker_id as string,
    code: created.location_locker_code,
  };
}

/**
 * Bulk generates lockers for a location.
 */
export async function adminGenerateLockers(args: {
  locationId: string;
  total: number;
}): Promise<{
  location_id: string;
  created_count: number;
  created_lockers: Array<{ id: string; code: string | null }>;
  total_lockers: number;
}> {
  const { locationId, total } = args;

  if (!locationId) {
    throw new Error("Missing locationId");
  }

  if (!Number.isInteger(total) || total <= 0) {
    throw new Error("Invalid total; must be a positive integer");
  }

  // Fetch location to get prefix and current total_lockers
  const { data: locData, error: locErr } = await supabase
    .from("mailroom_location_table")
    .select("mailroom_location_prefix, mailroom_location_total_lockers")
    .eq("mailroom_location_id", locationId)
    .single();

  if (locErr || !locData) {
    throw new Error("Location not found");
  }

  const prefix = (locData as T_LocationLockerUpdate).mailroom_location_prefix;
  const currentTotal =
    (locData as T_LocationLockerUpdate).mailroom_location_total_lockers ?? 0;

  const startIndex = currentTotal + 1;
  const endIndex = currentTotal + total;

  const lockersToInsert: T_LocationLockerInsert[] = [];
  const cleanPrefix = prefix ? String(prefix).trim() : null;
  const codePrefix = cleanPrefix ? `${cleanPrefix}-` : "L-";

  for (let i = startIndex; i <= endIndex; i += 1) {
    lockersToInsert.push({
      mailroom_location_id: locationId,
      location_locker_code: `${codePrefix}${i}`,
      location_locker_is_available: true,
      location_locker_is_assignable: true,
    });
  }

  const { data: insertData, error: insertErr } = await supabase
    .from("location_locker_table")
    .insert(lockersToInsert)
    .select();

  if (insertErr) {
    throw new Error("Failed to create lockers");
  }

  const created = insertData as T_LocationLockerInsert[];

  return {
    location_id: locationId,
    created_count: created.length,
    created_lockers: created.map((r) => ({
      id: r.location_locker_id as string,
      code: r.location_locker_code as string,
    })),
    total_lockers: currentTotal + created.length,
  };
}
