import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Create standard client for Auth (Sign Up)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Create Admin client for Database Insert (Bypass RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const origin = new URL(req.url).origin;

    // 3. Sign up the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/signin`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. Manually create the user in public.users table
    if (data.user) {
      // We use empty strings for names because your schema requires them (NOT NULL),
      // but we don't have them yet. The 'needs_onboarding' flag handles the rest.
      const { error: dbError } = await supabaseAdmin.from("users").insert({
        id: data.user.id,
        email: email,
        first_name: "", // Placeholder
        last_name: "", // Placeholder
        role: "user",
        needs_onboarding: true,
      });

      if (dbError) {
        console.error("Error creating public user record:", dbError);
        // Note: We don't return an error here to the client because the Auth account
        // was successfully created. The user might just need to contact support
        // or the app needs to handle the missing row gracefully later.
      }
    }

    return NextResponse.json({
      message: "Signup successful, please check your email.",
      user: data.user,
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
