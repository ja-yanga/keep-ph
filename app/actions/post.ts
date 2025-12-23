import { RequestRewardClaimArgs, RpcClaimResponse } from "@/utils/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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
