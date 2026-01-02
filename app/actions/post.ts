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
  const document_number = String(formData.get("document_number") ?? "");
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

  const upsertPayload = {
    user_id: userId,
    user_kyc_status: "SUBMITTED",
    user_kyc_id_document_type: document_type,
    user_kyc_id_front_url: id_front_url,
    user_kyc_id_back_url: id_back_url,
    user_kyc_first_name: first_name,
    user_kyc_last_name: last_name,
    user_kyc_date_of_birth: birth_date || null,
    user_kyc_agreements_accepted: true, // assume accepted on submit
  };

  const { data: kycData, error: upErr } = await supabase
    .from("user_kyc_table")
    .upsert(upsertPayload, { onConflict: "user_id" })
    .select()
    .single();
  if (upErr) throw upErr;

  // Insert address if provided
  if (address_line1) {
    const addressPayload = {
      user_kyc_id: kycData.user_kyc_id,
      user_kyc_address_line_one: address_line1,
      user_kyc_address_line_two: address_line2 || null,
      user_kyc_address_city: city || null,
      user_kyc_address_region: region || null,
      user_kyc_address_postal_code: postal ? parseInt(postal) : null,
      user_kyc_address_is_default: true,
    };
    const { error: addrErr } = await supabase
      .from("user_kyc_address_table")
      .insert(addressPayload);
    if (addrErr) throw addrErr;
  }

  return { ok: true, status: "SUBMITTED" };
}

export async function createAddress({
  user_id,
  line1,
  line2,
  city,
  region,
  postal,
  is_default,
}: {
  user_id: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  is_default?: boolean;
}) {
  // Get user_kyc_id from user_id
  const { data: kycData, error: kycError } = await supabase
    .from("user_kyc_table")
    .select("user_kyc_id")
    .eq("user_id", user_id)
    .single();
  if (kycError || !kycData) {
    throw new Error("KYC not found for user");
  }
  const user_kyc_id = kycData.user_kyc_id;

  if (is_default) {
    await supabase
      .from("user_kyc_address_table")
      .update({ user_kyc_address_is_default: false })
      .eq("user_kyc_id", user_kyc_id);
  }

  const { data, error } = await supabase
    .from("user_kyc_address_table")
    .insert([
      {
        user_kyc_id,
        user_kyc_address_line_one: line1,
        user_kyc_address_line_two: line2 || null,
        user_kyc_address_city: city || null,
        user_kyc_address_region: region || null,
        user_kyc_address_postal_code: postal ? parseInt(postal) : null,
        user_kyc_address_is_default: !!is_default,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Log activity
  const addressData = data as Record<string, unknown>;
  await logActivity({
    userId: user_id,
    action: "CREATE",
    type: "USER_UPDATE_PROFILE",
    entityType: "USER_ADDRESS",
    entityId: addressData.user_kyc_address_id as string,
    details: {
      user_kyc_address_id: addressData.user_kyc_address_id,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    },
  });

  return { ok: true, address: data };
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
 * Generates a unique mailroom registration code.
 */
async function generateMailroomCode(): Promise<string> {
  let mailroomCode = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    // use hex (base16) instead of base36
    const randomStr = Math.random().toString(16).substring(2, 8).toUpperCase(); // 6 hex chars
    mailroomCode = `KPH-${randomStr}`;

    const { data: existing } = await supabase
      .from("mailroom_registration_table")
      .select("mailroom_registration_id")
      .eq("mailroom_registration_code", mailroomCode)
      .maybeSingle();

    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique mailroom code");
  }

  return mailroomCode;
}

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
      registration: payload.registration,
      lockerIds: payload.lockerIds,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error: ${String(err)}`);
  }
}

/**
 * Creates a mailroom location for admin.
 * Used in:
 * - app/api/admin/mailroom/locations/route.ts - API endpoint for creating locations
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
      entityType: undefined, // No specific entity type for locations in enum
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
 * Creates a mailroom package (mailbox item) for admin.
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
      userId: meta.user_id ?? "",
      locationId: meta.location_id ?? "",
      planId: meta.plan_id ?? "",
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
