import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createAddress } from "@/app/actions/post";

const supabaseAdmin = createSupabaseServiceClient();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .select(
        "id,user_id,label,contact_name,line1,line2,city,region,postal,is_default,created_at",
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

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
    const { user_id, line1, line2, city, region, postal, is_default } = body;
    if (!user_id || !line1)
      return NextResponse.json(
        { error: "user_id and line1 required" },
        { status: 400 },
      );

    const result = await createAddress({
      user_id,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("user.addresses.POST:", err);
    return NextResponse.json({ error: err || "Server error" }, { status: 500 });
  }
}
