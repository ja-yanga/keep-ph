"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

const supabaseAdmin = createSupabaseServiceClient();

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

export async function deleteMailroomAssignedLocker(id: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "delete_mailroom_assigned_locker",
    {
      input_id: id,
    },
  );

  if (error) throw error;
  return data;
}

/**
 * Soft deletes a mailroom locker and decrements location total_lockers.
 * Used in:
 * - app/api/admin/mailroom/lockers/[id]/route.ts
 */
export async function adminDeleteMailroomLocker(id: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_delete_mailroom_locker",
    {
      input_id: id,
    },
  );
  if (error) throw error;
  return data;
}
