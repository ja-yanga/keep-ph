import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

export async function POST() {
  // 1. Initialize Supabase Client
  // This automatically connects to the correct cookies (sb-*-auth-token)
  const supabase = await createClient();

  // Get user before signing out for logging
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Sign Out
  // This revokes the token on Supabase servers AND triggers the 'remove' cookie method above
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
}
