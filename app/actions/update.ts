"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import type {
  AdminUpdateClaimResponse,
  AdminUpdateMailroomPlanArgs,
  AdminIpWhitelistEntry,
  MailroomPlanRow,
  RpcAdminClaim,
  T_NotificationType,
  UpdateRewardClaimArgs,
  UpdateUserKycStatusArgs,
  LocationLockerUpdate,
  T_LocationLocker,
  AdminMailroomPackage, // Added
  AdminUpdateMailroomPackageArgs, // Added
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

export const adminUpdateIpWhitelist = async (args: {
  id: string;
  ipCidr: string;
  description?: string | null;
  updatedBy?: string | null;
}): Promise<AdminIpWhitelistEntry> => {
  const { data, error } = await supabaseAdmin.rpc("admin_update_ip_whitelist", {
    input_id: args.id,
    input_ip_cidr: args.ipCidr,
    input_description: args.description ?? null,
    input_updated_by: args.updatedBy ?? null,
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
};

export const adminUpdateUserKyc = async ({
  userId,
  status,
  actorUserId,
}: UpdateUserKycStatusArgs & { actorUserId?: string }) => {
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

  // Log activity
  if (actorUserId) {
    try {
      // Fetch user's KYC details for logging
      const { data: kycData } = await supabaseAdmin
        .from("user_kyc_table")
        .select("user_kyc_first_name, user_kyc_last_name")
        .eq("user_id", userId)
        .single();

      await logActivity({
        userId: actorUserId,
        action: normalizedStatus === "VERIFIED" ? "APPROVE" : "REJECT",
        type: "ADMIN_ACTION",
        entityType: "USER_KYC",
        entityId: userId,
        details: {
          kyc_description: `Admin ${normalizedStatus === "VERIFIED" ? "verified" : "rejected"} KYC for ${kycData?.user_kyc_first_name}${kycData?.user_kyc_last_name}`,
        },
      });
    } catch (logErr) {
      console.error("KYC activity log failed:", logErr);
    }
  }

  // Background trigger for Resend email notification
  (async () => {
    try {
      const { data: userRow } = await supabaseAdmin
        .from("users_table")
        .select("users_email")
        .eq("users_id", userId)
        .single();

      if (userRow?.users_email) {
        const { data: kycRow } = await supabaseAdmin
          .from("user_kyc_table")
          .select("user_kyc_first_name")
          .eq("user_id", userId)
          .single();

        const template =
          normalizedStatus === "VERIFIED" ? "KYC_VERIFIED" : "KYC_REJECTED";
        const protocol =
          process.env.NODE_ENV === "development" ? "http" : "https";
        const host = process.env.NEXT_PUBLIC_APP_URL || "localhost:3000";

        await fetch(`${protocol}://${host}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: userRow.users_email,
            template,
            data: {
              recipientName: kycRow?.user_kyc_first_name || "User",
              reason:
                normalizedStatus === "REJECTED"
                  ? "Please ensure your documents are clear and valid."
                  : undefined,
            },
          }),
        });
      }
    } catch (err) {
      console.error("KYC background email error:", err);
    }
  })();

  return data;
};

export const markAsReadNotification = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { error } = await supabaseAdmin.rpc("mark_notifications_as_read", {
    input_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return { ok: true };
};

export const adminUpdateMailroomPlan = async ({
  id,
  updates,
}: AdminUpdateMailroomPlanArgs): Promise<MailroomPlanRow> => {
  if (!id) {
    throw new Error("Plan ID is required");
  }

  const payload = {
    input_plan_id: id,
    input_updates: updates,
  };

  const { data, error } = await supabaseAdmin.rpc(
    "admin_update_mailroom_plan",
    payload,
  );

  if (error) {
    throw error;
  }

  return data as MailroomPlanRow;
};

/**
 * Updates a mailroom package (mailbox item) for admin.
 * Used in:
 * - app/api/admin/mailroom/packages/[id]/route.ts - API endpoint for updating packages
 */
export async function adminUpdateMailroomPackage(
  args: AdminUpdateMailroomPackageArgs,
): Promise<AdminMailroomPackage> {
  const { data, error } = await supabaseAdmin.rpc("admin_update_mailbox_item", {
    input_data: {
      user_id: args.userId,
      id: args.id,
      package_name: args.package_name,
      registration_id: args.registration_id,
      locker_id: args.locker_id,
      package_type: args.package_type,
      status: args.status,
      package_photo: args.package_photo,
      locker_status: args.locker_status,
    },
  });

  if (error) {
    throw error;
  }

  const result = data as {
    ok: boolean;
    item: Record<string, unknown>;
    old_status: string;
    old_registration_id: string;
    old_item_name: string;
  };

  // Ensure the returned item has the latest files
  const { data: itemWithFiles } = await supabaseAdmin
    .from("mailbox_item_table")
    .select("*, mailroom_file_table(*)")
    .eq("mailbox_item_id", args.id)
    .single();

  // Cast existing item if no fresh fetch
  let finalItem = result.item as AdminMailroomPackage;

  if (itemWithFiles) {
    result.item = itemWithFiles as Record<string, unknown>; // update reference
    finalItem = itemWithFiles as AdminMailroomPackage;
  }

  // Send notification if status changed
  if (args.status && result.old_status !== args.status) {
    const { data: registration } = await supabaseAdmin
      .from("mailroom_registration_table")
      .select("user_id, mailroom_registration_code")
      .eq("mailroom_registration_id", result.old_registration_id)
      .single();

    if (registration) {
      const regData = registration as Record<string, unknown>;
      const userId = regData.user_id as string;
      const code = (regData.mailroom_registration_code as string) || "Unknown";
      const packageName = result.item.mailbox_item_name as string;

      let title = "Package Update";
      let message = `Your package (${packageName}) at Mailroom ${code} status is now: ${args.status}`;
      let type: T_NotificationType = "SYSTEM";

      if (args.status === "RELEASED") {
        title = "Package Released";
        message = `Package (${packageName}) from Mailroom ${code} has been picked up/released.`;
        type = "PACKAGE_RELEASED";
      } else if (args.status === "DISPOSED") {
        title = "Package Disposed";
        message = `Package (${packageName}) from Mailroom ${code} has been disposed.`;
        type = "PACKAGE_DISPOSED";
      }

      await sendNotification(
        userId,
        title,
        message,
        type,
        `/mailroom/${result.old_registration_id}`,
      );
    }
  }

  // Log activity
  let activityAction: "UPDATE" | "RELEASE" | "DISPOSE" = "UPDATE";
  if (args.status === "RELEASED") activityAction = "RELEASE";
  if (args.status === "DISPOSED") activityAction = "DISPOSE";

  // Fetch locker code if locker_id exists
  let locker_code: string | null = null;
  const locker_id = args.locker_id ?? result.item.location_locker_id;
  if (locker_id) {
    const { data: lockerData } = await supabaseAdmin
      .from("location_locker_table")
      .select("location_locker_code")
      .eq("location_locker_id", locker_id as string)
      .single();
    locker_code = lockerData?.location_locker_code || null;
  }

  await logActivity({
    userId: args.userId,
    action: activityAction,
    type: "ADMIN_ACTION",
    entityType: "MAILBOX_ITEM",
    entityId: args.id,
    details: {
      package_status: args.status ?? result.old_status,
      package_name: (args.package_name ??
        result.item.mailbox_item_name) as string,
      package_type: (args.package_type ??
        result.item.mailbox_item_type ??
        "Parcel") as string,
      ...(locker_code && { package_locker_code: locker_code }),
    },
  });

  return finalItem;
}

export const updateMailboxItem = async (args: {
  userId: string;
  id: string;
  status?: string;
  selected_address_id?: string | null;
  notes?: string | Record<string, unknown>;
  release_to_name?: string;
  forward_address?: string;
  forward_tracking_number?: string;
  forward_3pl_name?: string;
  forward_tracking_url?: string;
}) => {
  const { data, error } = await supabaseAdmin.rpc(
    "user_request_mailbox_item_action",
    {
      input_data: {
        user_id: args.userId,
        mailbox_item_id: args.id,
        status: args.status,
        selected_address_id: args.selected_address_id,
        notes: args.notes,
        release_to_name: args.release_to_name,
        forward_address: args.forward_address,
        forward_tracking_number: args.forward_tracking_number,
        forward_3pl_name: args.forward_3pl_name,
        forward_tracking_url: args.forward_tracking_url,
      },
    },
  );

  if (error) {
    throw error;
  }

  // Log user-initiated activity
  if (args.status) {
    let activityAction: "SCAN" | "RELEASE" | "DISPOSE" | "CANCEL" | "UPDATE" =
      "UPDATE";
    let activityType:
      | "USER_REQUEST_SCAN"
      | "USER_REQUEST_RELEASE"
      | "USER_REQUEST_DISPOSE"
      | "USER_REQUEST_CANCEL"
      | "USER_REQUEST_OTHERS" = "USER_REQUEST_OTHERS";

    // Map status to action and type
    if (args.status === "REQUEST_TO_SCAN") {
      activityAction = "SCAN";
      activityType = "USER_REQUEST_SCAN";
    } else if (args.status === "REQUEST_TO_RELEASE") {
      activityAction = "RELEASE";
      activityType = "USER_REQUEST_RELEASE";
    } else if (args.status === "REQUEST_TO_DISPOSE") {
      activityAction = "DISPOSE";
      activityType = "USER_REQUEST_DISPOSE";
    }

    try {
      // Fetch package details for consistent logging
      const { data: pkgDetails } = await supabaseAdmin
        .from("mailbox_item_table")
        .select("mailbox_item_name, mailbox_item_type, location_locker_id")
        .eq("mailbox_item_id", args.id)
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
        userId: args.userId,
        action: activityAction,
        type: activityType,
        entityType: "MAILBOX_ITEM",
        entityId: args.id,
        details: {
          package_status: args.status,
          package_name: pkgDetails?.mailbox_item_name || "Unknown",
          package_type: pkgDetails?.mailbox_item_type || "Parcel",
          ...(locker_code && { package_locker_code: locker_code }),
        },
      });
    } catch (logErr) {
      console.error("User package action activity log failed:", logErr);
    }
  }

  return data;
};

export const cancelMailroomSubscription = async (
  registrationId: string,
): Promise<{ ok: boolean; success?: string; error?: string }> => {
  const { data, error } = await supabaseAdmin.rpc(
    "cancel_user_mailroom_subscription",
    {
      input_registration_id: registrationId,
    },
  );

  if (error) {
    console.error("cancel subscription error:", error);
    return { ok: false, error: error.message };
  }

  if (data) {
    return { ok: true, success: "Subscription cancelled successfully" };
  }

  return { ok: false, error: "Subscription not found" };
};

export async function adminUpdateUserRole(args: {
  targetUserId: string;
  newRole: string;
  actorUserId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin.rpc("admin_update_user_role", {
    input_target_user_id: args.targetUserId,
    input_new_role: args.newRole,
    input_actor_user_id: args.actorUserId,
  });

  if (error) {
    console.error("admin_update_user_role RPC error:", error);
    return { ok: false, error: error.message };
  }

  const result =
    typeof data === "string"
      ? (JSON.parse(data) as { ok: boolean; error?: string })
      : (data as { ok: boolean; error?: string });

  return result;
}

export async function adminUpdateMailroomLocation(args: {
  id: string;
  body: Record<string, unknown>;
}) {
  const { id, body } = args;

  if (!id) {
    throw new Error("Missing id parameter");
  }

  const name = body.name !== undefined ? String(body.name) : undefined;

  let code: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "code")) {
    code = body.code ? String(body.code) : null;
  } else {
    code = undefined;
  }

  let region: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "region")) {
    region = body.region ? String(body.region) : null;
  } else {
    region = undefined;
  }

  let city: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "city")) {
    city = body.city ? String(body.city) : null;
  } else {
    city = undefined;
  }

  let barangay: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "barangay")) {
    barangay = body.barangay ? String(body.barangay) : null;
  } else {
    barangay = undefined;
  }

  let zip: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "zip")) {
    zip = body.zip ? String(body.zip) : null;
  } else {
    zip = undefined;
  }

  let totalLockers: number | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "total_lockers")) {
    const n = Number(body.total_lockers);
    totalLockers = Number.isNaN(n) ? 0 : n;
  } else {
    totalLockers = undefined;
  }

  let isHidden: boolean | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "is_hidden")) {
    isHidden = Boolean(body.is_hidden);
  } else {
    isHidden = undefined;
  }

  let maxLockerLimit: number | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "max_locker_limit")) {
    const n = Number(body.max_locker_limit);
    maxLockerLimit = Number.isNaN(n) ? null : n;
  } else {
    maxLockerLimit = undefined;
  }

  const { data, error } = await supabaseAdmin.rpc(
    "rpc_update_mailroom_location",
    {
      p_id: id,
      p_name: name ?? null,
      p_code: code ?? null,
      p_region: region ?? null,
      p_city: city ?? null,
      p_barangay: barangay ?? null,
      p_zip: zip ?? null,
      p_total_lockers: totalLockers ?? null,
      p_is_hidden: isHidden ?? null,
      p_max_locker_limit: maxLockerLimit ?? null,
    },
  );

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? "Location not found");
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    id: row.id,
    name: row.name,
    code: row.code ?? null,
    region: row.region ?? null,
    city: row.city ?? null,
    barangay: row.barangay ?? null,
    zip: row.zip ?? null,
    total_lockers: row.total_lockers ?? 0,
    is_hidden: row.is_hidden ?? false,
    max_locker_limit: row.max_locker_limit ?? null,
  };
}
/**
 * Updates an existing locker for admin.
 */
export async function adminUpdateLocker(args: {
  id: string;
  lockerCode?: string;
  isAvailable?: boolean;
  isAssignable?: boolean;
  locationId?: string;
  assignmentStatus?: string;
}): Promise<unknown> {
  const {
    id,
    lockerCode,
    isAvailable,
    locationId,
    assignmentStatus,
    isAssignable,
  } = args;

  if (!id) {
    throw new Error("Missing id");
  }

  // fetch current locker to know original location (for total_lockers adjustments)
  const { data: currentLocker, error: currErr } = await supabaseAdmin
    .from("location_locker_table")
    .select("mailroom_location_id")
    .eq("location_locker_id", id)
    .maybeSingle();

  if (currErr) throw currErr;

  const originalLocationId = currentLocker?.mailroom_location_id ?? null;

  const updates: LocationLockerUpdate = {};
  if (lockerCode !== undefined) updates.location_locker_code = lockerCode;
  if (isAvailable !== undefined)
    updates.location_locker_is_available = isAvailable;
  if (locationId !== undefined) updates.mailroom_location_id = locationId;
  if (isAssignable !== undefined)
    updates.location_locker_is_assignable = isAssignable;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("location_locker_table")
      .update(updates)
      .eq("location_locker_id", id);
    if (error) throw error;
  }

  // if location changed, adjust total_lockers counters
  if (locationId !== undefined && locationId !== originalLocationId) {
    // Decrement old
    if (originalLocationId) {
      const { data: oldLoc } = await supabaseAdmin
        .from("mailroom_location_table")
        .select("mailroom_location_total_lockers")
        .eq("mailroom_location_id", originalLocationId)
        .maybeSingle();
      if (oldLoc) {
        const cur = oldLoc.mailroom_location_total_lockers ?? 0;
        await supabaseAdmin
          .from("mailroom_location_table")
          .update({ mailroom_location_total_lockers: Math.max(0, cur - 1) })
          .eq("mailroom_location_id", originalLocationId);
      }
    }
    // Increment new
    if (locationId) {
      const { data: newLoc } = await supabaseAdmin
        .from("mailroom_location_table")
        .select("mailroom_location_total_lockers")
        .eq("mailroom_location_id", locationId)
        .maybeSingle();
      if (newLoc) {
        const cur = newLoc.mailroom_location_total_lockers ?? 0;
        await supabaseAdmin
          .from("mailroom_location_table")
          .update({ mailroom_location_total_lockers: cur + 1 })
          .eq("mailroom_location_id", locationId);
      }
    }
  }

  // Update assignment status if provided
  if (assignmentStatus) {
    const { error: assignErr } = await supabaseAdmin
      .from("mailroom_assigned_locker_table")
      .update({ mailroom_assigned_locker_status: assignmentStatus })
      .eq("location_locker_id", id);

    // We don't throw Error if no assignment exists, just ignore
    void assignErr;
  }

  // fetch latest state to return
  const { data, error: reloadErr } = await supabaseAdmin
    .from("location_locker_table")
    .select("*, mailroom_location_table(mailroom_location_name)")
    .eq("location_locker_id", id)
    .single();

  if (reloadErr) throw reloadErr;

  return data as T_LocationLocker;
}
