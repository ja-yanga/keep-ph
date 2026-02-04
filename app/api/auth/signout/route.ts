import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.auth.signOut();

    if (user) {
      logActivity({
        userId: user.id,
        action: "LOGOUT",
        type: "USER_LOGOUT",
        entityType: "USER",
        entityId: user.id,
        details: {
          email: user.email,
          platform: "web",
        },
      }).catch((logError) => {
        console.error("Failed to log sign-out activity:", logError);
      });
    }

    return NextResponse.json(
      { message: "Signed out successfully" },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("Signout error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
