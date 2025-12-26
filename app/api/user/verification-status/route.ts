import { NextResponse } from "next/server";
import { getUserVerificationStatus } from "@/app/actions/get";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/user/verification-status
 *
 * Returns the KYC verification status for the authenticated user.
 *
 * Authentication:
 * - Browser: Uses cookies automatically
 * - Postman/API clients: Use Bearer token in Authorization header
 *   Header: Authorization: Bearer <access_token>
 *
 * @example
 * ```bash
 * # Postman/curl
 * curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
 *      http://localhost:3000/api/user/verification-status
 * ```
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please provide a valid Bearer token or be logged in.",
        },
        { status: 401 },
      );
    }

    const status = await getUserVerificationStatus(user.id);

    return NextResponse.json({
      ok: true,
      status: status ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("verification-status error:", {
      message,
      stack,
      error: err,
    });
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
