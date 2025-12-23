import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const selectCols = [
      "user_address_id",
      "user_id",
      "user_address_label",
      "user_address_line1",
      "user_address_line2",
      "user_address_city",
      "user_address_region",
      "user_address_postal",
      "user_address_is_default",
      "user_address_created_at",
      "users_table(users_id, users_email, mobile_number, user_kyc_table(user_kyc_first_name, user_kyc_last_name, user_kyc_status))",
    ].join(",");

    const { data, error } = await supabaseAdmin
      .from("user_address_table")
      .select(selectCols)
      .eq("user_id", userId)
      .order("user_address_is_default", { ascending: false })
      .order("user_address_created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error("user.addresses.GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, label, line1, line2, city, region, postal, is_default } =
      body;

    if (!user_id || !line1)
      return NextResponse.json(
        { error: "user_id and line1 required" },
        { status: 400 },
      );

    const payload = {
      user_id,
      user_address_label: label ?? null,
      user_address_line1: line1,
      user_address_line2: line2 ?? null,
      user_address_city: city ?? null,
      user_address_region: region ?? null,
      user_address_postal: postal ?? null,
      user_address_is_default: !!is_default,
    };

    if (payload.user_address_is_default) {
      await supabaseAdmin
        .from("user_address_table")
        .update({ user_address_is_default: false })
        .eq("user_id", user_id);
    }

    const { data, error } = await supabaseAdmin
      .from("user_address_table")
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error("user.addresses.POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
