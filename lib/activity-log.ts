import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const supabaseAdmin = createSupabaseServiceClient();

/**
 * Logs an activity to the activity_log_table
 */
export async function logActivity(args: {
  userId: string;
  action:
    | "PASSWORD_CHANGE"
    | "RESET_REQUEST"
    | "CREATE"
    | "STORE"
    | "UPDATE"
    | "DELETE"
    | "VIEW"
    | "SUBMIT"
    | "APPROVE"
    | "REJECT"
    | "PROCESS"
    | "COMPLETE"
    | "CANCEL"
    | "VERIFY"
    | "PAY"
    | "REFUND"
    | "LOGIN"
    | "LOGOUT"
    | "REGISTER"
    | "CLAIM"
    | "RELEASE"
    | "DISPOSE"
    | "ARCHIVE"
    | "RESTORE"
    | "SCAN"
    | "PURCHASE";
  type:
    | "AUTH_FORGOT_PASSWORD"
    | "AUTH_PASSWORD_CHANGE"
    | "USER_REQUEST_SCAN"
    | "USER_REQUEST_RELEASE"
    | "USER_REQUEST_DISPOSE"
    | "USER_REQUEST_CANCEL"
    | "USER_REQUEST_REFUND"
    | "USER_REQUEST_REWARD"
    | "USER_REQUEST_OTHERS"
    | "USER_LOGIN"
    | "USER_LOGOUT"
    | "USER_UPDATE_PROFILE"
    | "USER_KYC_SUBMIT"
    | "USER_KYC_VERIFY"
    | "ADMIN_ACTION"
    | "SYSTEM_EVENT";
  entityType?:
    | "MAIL_ACTION_REQUEST"
    | "USER_KYC"
    | "PAYMENT_TRANSACTION"
    | "SUBSCRIPTION"
    | "MAILBOX_ITEM"
    | "MAILROOM_REGISTRATION"
    | "USER_ADDRESS"
    | "REWARDS_CLAIM"
    | "REFERRAL"
    | "NOTIFICATION"
    | "MAILROOM_FILE"
    | "MAILROOM_ASSIGNED_LOCKER"
    | "USER"
    | "ADMIN_IP_WHITELIST"
    | "ERROR_LOG";
  entityId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const headerList = await headers();

    // Determine the true client IP address
    let resolvedIp = args.ipAddress;
    if (!resolvedIp) {
      const forwardedFor = headerList.get("x-forwarded-for");
      if (forwardedFor) {
        // x-forwarded-for can be a list: "client, proxy1, proxy2"
        resolvedIp = forwardedFor.split(",")[0].trim();
      }
    }

    if (!resolvedIp || resolvedIp === "::1" || resolvedIp === "127.0.0.1") {
      const altIp =
        headerList.get("x-real-ip") ||
        headerList.get("cf-connecting-ip") ||
        headerList.get("x-client-ip");

      if (altIp) resolvedIp = altIp;
    }

    const resolvedUA = args.userAgent || headerList.get("user-agent");

    const payload = {
      user_id: args.userId,
      activity_action: args.action,
      activity_type: args.type,
      activity_entity_type: args.entityType || null,
      activity_entity_id: args.entityId || null,
      activity_details: {
        ...args.details,
      },
      activity_ip_address: resolvedIp || null,
      activity_user_agent: resolvedUA || null,
    };

    console.log("=== Activity Log Triggered ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const { error, data } = await supabaseAdmin
      .from("activity_log_table")
      .insert(payload)
      .select();

    if (error) {
      console.error("❌ Failed to log activity:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // Don't throw - activity logging failures shouldn't break the main operation
    } else {
      console.log("✅ Activity logged successfully:", data);
    }
  } catch (err) {
    console.error("Unexpected error logging activity:", err);
    // Don't throw - activity logging failures shouldn't break the main operation
  }
}
