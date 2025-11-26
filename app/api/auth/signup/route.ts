import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { email, password, first_name = "", last_name = "" } = await req.json();

  // redirect URL the user will land on after confirming email
  // set NEXT_PUBLIC_APP_URL in your project env (e.g. https://your-app.com or http://localhost:3000)
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/signin`
    : undefined;

  // ask Supabase to send confirmation email
  const { data, error } = await supabase.auth.signUp(
    { email, password },
    { redirectTo }
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // Insert into users table — allow empty first/last if client didn't send them
  const { error: insertError } = await supabase.from("users").insert({
    id: data.user?.id,
    email,
    first_name,
    last_name,
    role: "user",
  });

  if (insertError) {
    console.error("users insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Tell client that signup succeeded and verification email was sent
  return NextResponse.json({
    message: "Signup successful. A confirmation email has been sent.",
    user: data.user,
  });
}
