import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabase = createSupabaseServiceClient();

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id)
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    // return referrals where the user is either referrer or referred
    const { data, error } = await supabase
      .from("referral_table")
      .select("*")
      .or(
        `referral_referrer_user_id.eq.${user_id},referral_referred_user_id.eq.${user_id}`,
      )
      .order("referral_date_created", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ referrals: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
