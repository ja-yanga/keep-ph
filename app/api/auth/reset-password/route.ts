import { NextResponse } from "next/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    // 1. Extract the Access Token from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 },
      );
    }

    const accessToken = authHeader.split(" ")[1];

    // 2. Verify the token and get the User ID using the Anon Client
    const supabase = createBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("Token verification failed:", userError);
      return NextResponse.json(
        {
          error:
            "Invalid or expired session. Please try resetting your password again.",
        },
        { status: 401 },
      );
    }

    // 3. Use the Service Role (Admin) Client to update the password
    // We use admin.updateUserById because we are in a trusted server environment
    // and we have already verified the user's identity via the token above.
    const supabaseAdmin = createSupabaseServiceClient();

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: password,
      });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log successful password reset
    logActivity({
      userId: user.id,
      action: "PASSWORD_CHANGE",
      type: "AUTH_PASSWORD_CHANGE",
      entityType: "USER",
      entityId: user.id,
      details: {
        email: user.email,
        method: "reset_link",
        platform: "web",
      },
    }).catch((logError) => {
      console.error("Failed to log password reset activity:", logError);
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
