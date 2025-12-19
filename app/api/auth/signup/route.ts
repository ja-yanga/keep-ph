import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/utils/supabase/serviceClient";

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

    const origin = new URL(req.url).origin;

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

    if (data.user) {
      const { error: dbError } = await supabase.from("users_table").insert({
        users_id: data.user.id,
        users_email: email,
        users_role: "user",
      });

      if (dbError) {
        console.error("Error creating public user record:", dbError);
      }
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
