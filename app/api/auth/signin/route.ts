import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Initialize Supabase Client (Handles Cookies Automatically)
    // This ensures the cookies set here match what Middleware expects
    const supabase = await createClient();

    const { email, password } = await request.json();

    // 2. Sign In
    // This triggers the setAll method above, setting the correct cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Return quickly; client will fetch profile to decide onboarding/redirect
    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
    });
  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
