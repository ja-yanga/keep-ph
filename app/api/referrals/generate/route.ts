import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Admin client for database operations (bypassing RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Authenticate User via Cookie (using @supabase/ssr)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // We are only reading here
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Check existing code in 'users' table using Admin client
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (existingUser?.referral_code) {
      return NextResponse.json({ referral_code: existingUser.referral_code });
    }

    // 3. Generate new code if none exists
    // generate 8-hex-char code (base-16), uppercase, no prefix
    const code = randomBytes(4).toString("hex").toUpperCase();

    // 4. Update 'users' table
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ referral_code: code })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ referral_code: code });
  } catch (err: any) {
    console.error("Referral generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
