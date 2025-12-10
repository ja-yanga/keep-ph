import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .select(
        "id,user_id,label,contact_name,line1,line2,city,region,postal,is_default,created_at"
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error("user.addresses.GET:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      user_id,
      label,
      contact_name,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    } = body;
    if (!user_id || !line1)
      return NextResponse.json(
        { error: "user_id and line1 required" },
        { status: 400 }
      );

    if (is_default) {
      await supabaseAdmin
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user_id);
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .insert([
        {
          user_id,
          label: label || null,
          contact_name: contact_name || null,
          line1,
          line2: line2 || null,
          city: city || null,
          region: region || null,
          postal: postal || null,
          is_default: !!is_default,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, address: data });
  } catch (err: any) {
    console.error("user.addresses.POST:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
