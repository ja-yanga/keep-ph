import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_address_table")
      .select("*")
      .eq("user_id", user.id)
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
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { label, line1, line2, city, region, postal, is_default } = body;

    if (!line1)
      return NextResponse.json({ error: "line1 required" }, { status: 400 });

    const payload = {
      user_id: user.id,
      user_address_label: label ?? null,
      user_address_line1: line1,
      user_address_line2: line2 ?? null,
      user_address_city: city ?? null,
      user_address_region: region ?? null,
      user_address_postal: postal ?? null,
      user_address_is_default: !!is_default,
    };

    if (payload.user_address_is_default) {
      await supabase
        .from("user_address_table")
        .update({ user_address_is_default: false })
        .eq("user_id", user.id);
    }

    const { data, error } = await supabase
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
