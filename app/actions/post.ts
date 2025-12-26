"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { parseAddressRow } from "@/utils/helper";
import {
  CreateUserAddressArgs,
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

  return parseAddressRow(data);
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
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
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
 * Creates a mailroom registration with locker assignments.
 *
 * Used in:
 * - app/api/mailroom/register/route.ts - API endpoint for registration
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

    // Create registration
    const { data: registration, error: regError } = await supabase
      .from("mailroom_registration_table")
      .insert([
        {
          user_id: userId,
          mailroom_location_id: locationId,
          mailroom_plan_id: planId,
          mailroom_registration_code: mailroomCode,
          mailroom_registration_status: true,
        },
      ])
      .select()
      .single();

    if (regError || !registration) {
      throw new Error(regError?.message || "Failed to create registration");
    }

    // Get available lockers
    const { data: availableLockers, error: lockerError } = await supabase
      .from("location_locker_table")
      .select("location_locker_id")
      .eq("mailroom_location_id", locationId)
      .eq("location_locker_is_available", true)
      .limit(lockerQty);

    if (
      lockerError ||
      !availableLockers ||
      availableLockers.length < lockerQty
    ) {
      throw new Error("Insufficient lockers available");
    }

    const lockerIds = availableLockers.map((l) => l.location_locker_id);

    // Mark lockers as unavailable
    const { error: updateError } = await supabase
      .from("location_locker_table")
      .update({ location_locker_is_available: false })
      .in("location_locker_id", lockerIds);

    if (updateError) {
      console.error("Failed to update locker status:", updateError);
      // Note: In production, you might want to rollback the registration here
    }

    // Create assignment records
    const assignments = lockerIds.map((lockerId) => ({
      mailroom_registration_id: registration.mailroom_registration_id,
      location_locker_id: lockerId,
      mailroom_assigned_locker_status: "Normal" as const,
    }));

    const { error: assignError } = await supabase
      .from("mailroom_assigned_locker_table")
      .insert(assignments);

    if (assignError) {
      console.error("Failed to assign lockers:", assignError);
    }

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
