import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkEmailExistsAction } from "@/app/actions/get";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServiceClient();

    // Check if user already exists in public table using Action
    try {
      const emailExists = await checkEmailExistsAction(email);
      if (emailExists) {
        return NextResponse.json(
          {
            error:
              "Something went wrong with this email. Please use another one or sign in.",
          },
          { status: 400 },
        );
      }
    } catch (rpcError) {
      console.error("Error checking email existence:", rpcError);
    }

    const origin = new URL(req.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
        data: {
          role: "user", // Set role in metadata during signup
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log successful sign-up
    if (data.user) {
      logActivity({
        userId: data.user.id,
        action: "REGISTER",
        type: "USER_LOGIN",
        entityType: "USER",
        entityId: data.user.id,
        details: {
          email: data.user.email,
          provider: data.user.app_metadata.provider || "email",
          platform: "web",
        },
      }).catch((logError) => {
        console.error("Failed to log sign-up activity:", logError);
      });
    }

    return NextResponse.json({
      message: "Signup successful, please check your email.",
      user: data.user,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
