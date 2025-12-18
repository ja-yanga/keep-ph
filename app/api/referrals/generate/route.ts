import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(_req: Request) {
  // mark _req as used to satisfy linters (no-op)
  void _req;
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          // keep signature; mark param as used to avoid "defined but never used"
          setAll(_cookiesToSet: unknown): void {
            void _cookiesToSet;
            /* no-op: server handler only needs to read cookies */
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Check existing code in application users_table (updated schema)
    const { data: existingUser } = await supabaseAdmin
      .from("users_table")
      .select("users_referral_code")
      .eq("users_id", user.id)
      .single();

    if (existingUser?.users_referral_code) {
      return NextResponse.json({
        referral_code: existingUser.users_referral_code,
      });
    }

    // 3. Generate new code if none exists
    const code = randomBytes(4).toString("hex").toUpperCase();

    // 4. Update 'users' table
    const { error: updateError } = await supabaseAdmin
      .from("users_table")
      .update({ users_referral_code: code })
      .eq("users_id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ referral_code: code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Referral generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
