import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const order = url.searchParams.get("order");
  if (!order)
    return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("mailroom_registrations")
    .select("*")
    .eq("order_id", order)
    .maybeSingle();

  if (error) {
    console.error("[lookup-by-order] db error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null }, { status: 200 });
}
