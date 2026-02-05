"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import type { AdminIpWhitelistEntry } from "@/utils/types";

const supabaseAdmin = createSupabaseServiceClient();

export async function adminDeleteIpWhitelist(args: {
  id: string;
}): Promise<AdminIpWhitelistEntry> {
  const { data, error } = await supabaseAdmin.rpc("admin_delete_ip_whitelist", {
    input_id: args.id,
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

/**
 * Deletes a user storage file (scan) via RPC and removes it from storage.
 */
export async function deleteUserStorageFile(args: {
  userId: string;
  id: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("delete_user_storage_file", {
    input_data: {
      user_id: args.userId,
      file_id: args.id,
    },
  });

  if (error) {
    throw error;
  }

  const result = data as { success: boolean; file_url: string };

  if (result.success && result.file_url) {
    try {
      const match = result.file_url.match(
        /\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/,
      );
      if (match) {
        const bucket = match[1];
        const path = decodeURIComponent(match[2]);
        await supabaseAdmin.storage.from(bucket).remove([path]);
      }
    } catch (e) {
      console.error("[deleteUserStorageFile] storage delete failed:", e);
      // We continue since the DB row is already deleted by the RPC
    }
  }

  return result;
}

/**
 * Soft deletes a mailroom package (mailbox item) for admin via RPC.
 */
export async function adminDeleteMailroomPackage(args: {
  userId: string;
  id: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_delete_mailbox_item", {
    input_data: {
      user_id: args.userId,
      id: args.id,
    },
  });

  if (error) {
    throw error;
  }

  const result = data as {
    success: boolean;
    package_name: string;
    registration_id: string;
    deleted_at: string;
  };

  // Log activity
  await logActivity({
    userId: args.userId,
    action: "DELETE",
    type: "ADMIN_ACTION",
    entityType: "MAILBOX_ITEM",
    entityId: args.id,
    details: {
      mailbox_item_id: args.id,
      package_name: result.package_name,
      registration_id: result.registration_id,
      deleted_at: result.deleted_at,
    },
  });

  return result;
}
/**
 * Soft deletes a locker for admin.
 */
export async function adminDeleteLocker(args: {
  id: string;
}): Promise<boolean> {
  const { id } = args;

  if (!id) {
    throw new Error("Missing id");
  }
  const { data: lockerData, error: lockerErr } = await supabaseAdmin
    .from("location_locker_table")
    .select("mailroom_location_id")
    .eq("location_locker_id", id)
    .maybeSingle();

  if (lockerErr) {
    throw new Error("Failed to fetch locker for deletion");
  }

  const locId = lockerData?.mailroom_location_id;

  // soft delete locker
  const { error: delErr } = await supabaseAdmin
    .from("location_locker_table")
    .update({ location_locker_deleted_at: new Date() })
    .eq("location_locker_id", id);

  if (delErr) {
    throw delErr;
  }

  // decrement total_lockers if location present
  if (locId) {
    const { data: locData, error: locErr } = await supabaseAdmin
      .from("mailroom_location_table")
      .select("mailroom_location_total_lockers")
      .eq("mailroom_location_id", locId)
      .maybeSingle();

    if (!locErr && locData) {
      const current = locData.mailroom_location_total_lockers ?? 0;
      const newTotal = Math.max(0, current - 1);
      await supabaseAdmin
        .from("mailroom_location_table")
        .update({ mailroom_location_total_lockers: newTotal })
        .eq("mailroom_location_id", locId);
    }
  }

  return true;
}
