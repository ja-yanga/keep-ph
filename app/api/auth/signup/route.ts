import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkEmailExistsAction } from "@/app/actions/get";

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
      // We continue if the check fails, or we could return an error.
      // Given the requirement, we should probably handle it gracefully or return a generic error.
    }

    const origin = new URL(req.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
