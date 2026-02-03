import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { resolveClientIp } from "@/lib/ip-utils";

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

/** Status codes we do not log to avoid flooding the error_log_table */
const SKIP_LOG_STATUSES = [401, 403];

/** Only log errors for write operations (create/update/delete), not GET/read. */
const LOG_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function statusToErrorType(status: number): ErrorLogArgs["errorType"] {
  if (status >= 500) return "SYSTEM_ERROR";
  if (status === 400 || status === 404 || status === 422)
    return "VALIDATION_ERROR";
  if (status === 402 || (status >= 420 && status < 430)) return "PAYMENT_ERROR";
  return "API_ERROR";
}

function statusToErrorCode(status: number): string | undefined {
  if (status === 401) return "AUTH_401_UNAUTHORIZED";
  if (status === 403) return "AUTH_403_FORBIDDEN";
  if (status === 400) return "VALIDATION_FIELD_REQUIRED";
  if (status >= 500) return "DB_QUERY_ERROR";
  return undefined;
}

export type LogApiErrorOptions = {
  status: number;
  message: string;
  error?: unknown;
  errorCode?: string;
  errorDetails?: Record<string, unknown>;
  userId?: string | null;
  requestBody?: Record<string, unknown> | null;
};

/**
 * Log an API error to error_log_table. Skips 401/403 to avoid flooding.
 * Only logs for write operations (POST, PUT, PATCH, DELETE); GET/read errors are not logged.
 * Call with void so it does not block the response (e.g. void logApiError(req, {...})).
 */
export function logApiError(
  request: Request,
  options: LogApiErrorOptions,
): void {
  const { status, message, error, errorDetails, userId, requestBody } = options;
  if (SKIP_LOG_STATUSES.includes(status)) return;
  if (!LOG_METHODS.includes(request.method)) return;

  const url = new URL(request.url);
  const requestPath = url.pathname;
  const requestMethod = request.method;
  const ipAddress = resolveClientIp(request.headers, null);
  const userAgent = request.headers.get("user-agent") ?? null;
  const errorStack = error instanceof Error ? (error.stack ?? null) : null;
  const errorCode = options.errorCode ?? statusToErrorCode(status);
  const errorType = statusToErrorType(status);

  void logError({
    errorType,
    errorMessage: message,
    errorCode: errorCode ?? undefined,
    errorStack,
    requestPath,
    requestMethod,
    requestBody: requestBody ?? null,
    requestHeaders: headersToObject(request.headers),
    responseStatus: status,
    errorDetails: errorDetails ?? null,
    ipAddress,
    userAgent,
    userId: userId ?? null,
  });
}
