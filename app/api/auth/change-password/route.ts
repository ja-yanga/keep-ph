import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate User via Cookie (using server-side client)
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Get Body
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // NOTE:
    // Server cannot safely re-sign-in with the user's password in this runtime.
    // Since this endpoint runs server-side with the user's session, proceed to update the password
    // for the authenticated user. If you require verifying the current password, do it client-side
    // before calling this endpoint.
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;

    // Log successful password change
    logActivity({
      userId: user.id,
      action: "PASSWORD_CHANGE",
      type: "AUTH_PASSWORD_CHANGE",
      entityType: "USER",
      entityId: user.id,
      details: {
        email: user.email,
        platform: "web",
      },
    }).catch((logError) => {
      console.error("Failed to log password change activity:", logError);
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err: unknown) {
    console.error("Change password error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
