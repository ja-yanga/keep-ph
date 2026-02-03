import { createSupabaseServiceClient } from "@/lib/supabase/server";

type ErrorLogArgs = {
  errorType:
    | "API_ERROR"
    | "DATABASE_ERROR"
    | "VALIDATION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "AUTHORIZATION_ERROR"
    | "PAYMENT_ERROR"
    | "EXTERNAL_SERVICE_ERROR"
    | "SYSTEM_ERROR"
    | "UNKNOWN_ERROR";
  errorMessage: string;
  errorCode?: string;
  errorStack?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  requestBody?: Record<string, unknown> | null;
  requestHeaders?: Record<string, string> | null;
  responseStatus?: number | null;
  errorDetails?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId?: string | null;
};

function headersToObject(
  headers?: Headers | null,
): Record<string, string> | null {
  if (!headers) return null;
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function logError(args: ErrorLogArgs): Promise<void> {
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const payload = {
      user_id: args.userId ?? null,
      error_type: args.errorType,
      error_message: args.errorMessage,
      error_code: args.errorCode ?? null,
      error_stack: args.errorStack ?? null,
      request_path: args.requestPath ?? null,
      request_method: args.requestMethod ?? null,
      request_body: args.requestBody ?? null,
      request_headers: args.requestHeaders ?? null,
      response_status: args.responseStatus ?? null,
      error_details: args.errorDetails ?? null,
      ip_address: args.ipAddress ?? null,
      user_agent: args.userAgent ?? null,
    };

    const { error } = await supabaseAdmin
      .from("error_log_table")
      .insert(payload);

    if (error) {
      console.error("❌ Failed to log error:", error);
    }
  } catch (err) {
    console.error("Unexpected error logging error:", err);
  }
}

export function serializeHeaders(headers: Headers): Record<string, string> {
  return headersToObject(headers) ?? {};
}
