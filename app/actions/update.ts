"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendNotification, type NotificationType } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import type {
  AdminUpdateClaimResponse,
  AdminUpdateMailroomPlanArgs,
  MailroomPlanRow,
  RpcAdminClaim,
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
  // Fetch existing package
  const { data: oldPkg, error: fetchError } = await supabaseAdmin
    .from("mailbox_item_table")
    .select(
      "mailbox_item_id, mailroom_registration_id, mailbox_item_status, mailbox_item_name",
    )
    .eq("mailbox_item_id", args.id)
    .single();

  if (fetchError || !oldPkg) {
    throw new Error("Package not found");
  }

  const oldPkgData = oldPkg as Record<string, unknown>;
  const oldRegistrationId = oldPkgData.mailroom_registration_id as string;
  const oldStatus = oldPkgData.mailbox_item_status as string;

  // Build update payload - map frontend field names to database column names
  const updatePayload: Record<string, unknown> = {};
  if (args.package_name !== undefined) {
    updatePayload.mailbox_item_name = args.package_name;
  }
  if (args.registration_id !== undefined) {
    updatePayload.mailroom_registration_id = args.registration_id;
  }
  if (args.locker_id !== undefined) {
    updatePayload.location_locker_id = args.locker_id;
  }
  if (args.package_type !== undefined) {
    updatePayload.mailbox_item_type = args.package_type;
  }
  if (args.status !== undefined) {
    updatePayload.mailbox_item_status = args.status;
  }
  if (Object.prototype.hasOwnProperty.call(args, "package_photo")) {
    updatePayload.mailbox_item_photo = args.package_photo;
  }
  updatePayload.mailbox_item_updated_at = new Date().toISOString();

  // Update the package
  const { data: updatedPkg, error } = await supabaseAdmin
    .from("mailbox_item_table")
    .update(updatePayload)
    .eq("mailbox_item_id", args.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update locker status if provided
  if (args.locker_status && oldRegistrationId) {
    const { data: assignment } = await supabaseAdmin
      .from("mailroom_assigned_locker_table")
      .select("mailroom_assigned_locker_id")
      .eq("mailroom_registration_id", oldRegistrationId)
      .single();

    if (assignment) {
      await supabaseAdmin
        .from("mailroom_assigned_locker_table")
        .update({ mailroom_assigned_locker_status: args.locker_status })
        .eq(
          "mailroom_assigned_locker_id",
          (assignment as Record<string, unknown>).mailroom_assigned_locker_id,
        );
    }
  }

  // Send notification if status changed
  if (args.status && oldStatus !== args.status) {
    const { data: registration } = await supabaseAdmin
      .from("mailroom_registration_table")
      .select("user_id, mailroom_registration_code")
      .eq("mailroom_registration_id", oldRegistrationId)
      .single();

    if (registration) {
      const regData = registration as Record<string, unknown>;
      const userId = regData.user_id as string;
      const code = (regData.mailroom_registration_code as string) || "Unknown";
      const packageName = (updatedPkg as Record<string, unknown>)
        .mailbox_item_name as string;

      let title = "Package Update";
      let message = `Your package (${packageName}) at Mailroom ${code} status is now: ${args.status}`;
      let type: NotificationType = "SYSTEM";

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
        `/mailroom/${oldRegistrationId}`,
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
      old_status: oldStatus,
      new_status: args.status,
    },
  });

  return updatedPkg;
}
