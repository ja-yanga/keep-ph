import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReferralCode } from "@/app/actions/post";

export async function POST(_req: Request) {
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

    const result = await generateReferralCode(user.id);

    return NextResponse.json({ referral_code: result.referral_code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Referral generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
