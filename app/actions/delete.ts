"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

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
