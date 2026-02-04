import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use server client for API routes
    const supabase = await createClient();
    const origin = new URL(req.url).origin;

    // Send password reset email
    // CHANGED: Point to the callback route so the session is established BEFORE they land on the page
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log the request if the user exists
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: userData } = await supabaseAdmin
      .from("users_table")
      .select("users_id")
      .eq("users_email", email)
      .single();

    if (userData) {
      logActivity({
        userId: userData.users_id,
        action: "RESET_REQUEST",
        type: "AUTH_FORGOT_PASSWORD",
        entityType: "USER",
        entityId: userData.users_id,
        details: {
          email,
          platform: "web",
        },
      }).catch((logError) => {
        console.error("Failed to log forgot-password activity:", logError);
      });
    }

    return NextResponse.json({ message: "Password reset email sent" });
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
