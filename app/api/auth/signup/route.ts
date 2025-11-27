import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email, password, first_name, last_name } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Initialize Clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Use Service Key for DB inserts if available (bypasses RLS), otherwise fallback to Anon Key
    const supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : supabase;

    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/signin`
      : undefined;

    // 2. Sign Up (Auth)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        // Storing metadata here is a good backup
        data: { first_name, last_name },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 3. Create Profile
    if (data.user) {
      const { error: insertError } = await supabaseAdmin
        .from("profiles") // Ensure this matches your DB table name
        .insert({
          id: data.user.id,
          email,
          first_name: first_name || "",
          last_name: last_name || "",
          role: "user",
          needs_onboarding: true,
        });

      if (insertError) {
        console.error("Profile insert error:", insertError);
        // We don't return 500 here because the Auth User was successfully created.
        // The user can likely fix their profile later via onboarding.
      }
    }

    return NextResponse.json({
      message: "Signup successful. Please check your email.",
      user: data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
