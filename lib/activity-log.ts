import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

/**
 * Logs an activity to the activity_log_table
 */
export async function logActivity(args: {
  userId: string;
  action:
    | "CREATE"
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
    | "SCAN";
  type:
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
    | "USER";
  entityId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("activity_log_table").insert({
      user_id: args.userId,
      activity_action: args.action,
      activity_type: args.type,
      activity_entity_type: args.entityType || null,
      activity_entity_id: args.entityId || null,
      activity_details: args.details,
      activity_ip_address: args.ipAddress || null,
    });

    if (error) {
      console.error("Failed to log activity:", error);
      // Don't throw - activity logging failures shouldn't break the main operation
    }
  } catch (err) {
    console.error("Unexpected error logging activity:", err);
    // Don't throw - activity logging failures shouldn't break the main operation
  }
}
