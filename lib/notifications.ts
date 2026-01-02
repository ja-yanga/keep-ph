import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { T_NotificationType } from "@/utils/types";

// Use Service Role Key to bypass RLS policies for inserts
// This ensures the system can always send a notification regardless of who is logged in
const supabaseAdmin = createSupabaseServiceClient();

/**
 * Sends a notification to a specific user.
 *
 * @param userId - The UUID of the user receiving the notification
 * @param title - Short title (e.g., "Package Arrived")
 * @param message - Detailed message body
 * @param type - Category for icon/color coding
 * @param link - Optional URL to redirect when clicked (e.g., "/dashboard")
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: T_NotificationType,
  link?: string,
) {
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    });

    if (error) {
      console.error("Failed to insert notification:", error);
    }
  } catch (err) {
    console.error("Unexpected error sending notification:", err);
  }
}
