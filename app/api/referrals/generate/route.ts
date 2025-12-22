import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { randomBytes } from "crypto";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST(_req: Request) {
  // mark _req as used to satisfy linters (no-op)
  void _req;
  try {
    const supabase = await createClient();

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
