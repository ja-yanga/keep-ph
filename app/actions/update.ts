"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import type {
  AdminUpdateClaimResponse,
  AdminUpdateMailroomPlanArgs,
  MailroomPlanRow,
  RpcAdminClaim,
  T_NotificationType,
  UpdateRewardClaimArgs,
  UpdateUserKycStatusArgs,
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

export const adminUpdateUserKyc = async ({
  userId,
  status,
}: UpdateUserKycStatusArgs) => {
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
export async function adminUpdateMailroomPackage(args: {
  userId: string;
  id: string;
  package_name?: string;
  registration_id?: string;
  locker_id?: string | null;
  package_type?: "Document" | "Parcel";
  status?: string;
  package_photo?: string | null;
  locker_status?: string;
}): Promise<unknown> {
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

  if (itemWithFiles) {
    result.item = itemWithFiles as Record<string, unknown>;
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
  await logActivity({
    userId: args.userId,
    action: "UPDATE",
    type: "ADMIN_ACTION",
    entityType: "MAILBOX_ITEM",
    entityId: args.id,
    details: {
      mailbox_item_id: args.id,
      updates: {
        package_name: args.package_name,
        registration_id: args.registration_id,
        locker_id: args.locker_id,
        package_type: args.package_type,
        status: args.status,
        package_photo: args.package_photo !== undefined ? "updated" : undefined,
        locker_status: args.locker_status,
      },
      old_status: result.old_status,
      new_status: args.status,
    },
  });

  return result.item;
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
