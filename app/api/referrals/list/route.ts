import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id)
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const { data, error } = await supabase
      .from("referrals_table")
      .select("*")
      .eq("referrals_user_id", user_id);

    if (error) throw error;

    return NextResponse.json({ referrals: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
