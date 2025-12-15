import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const order = url.searchParams.get("order");
  if (!order)
    return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const sbUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!sbUrl || !sbKey)
    return NextResponse.json(
      { error: "supabase env missing" },
      { status: 500 }
    );

  const sb = createClient(sbUrl, sbKey);
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
