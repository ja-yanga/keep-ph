import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { email, password } = await request.json();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const accessToken = data.session?.access_token ?? null;
    const refreshToken = data.session?.refresh_token ?? null;

    // Log successful sign-in
    if (data.user) {
      logActivity({
        userId: data.user.id,
        action: "LOGIN",
        type: "USER_LOGIN",
        entityType: "USER",
        entityId: data.user.id,
        details: {
          email: data.user.email,
          provider: data.user.app_metadata.provider || "email",
          platform: "web",
        },
      }).catch((logError) => {
        console.error("Failed to log sign-in activity:", logError);
      });
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
          }
        : null,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_at: data.session?.expires_at ?? null,
      expires_in: data.session?.expires_in ?? null,
    });
  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
