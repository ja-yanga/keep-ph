import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { logApiError } from "@/lib/error-log";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createClient();

    // Resend the signup confirmation email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Verification email resent" });
  } catch (err: unknown) {
    console.error("Resend error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
