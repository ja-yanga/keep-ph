import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order = url.searchParams.get("order");
    if (!order) {
      return NextResponse.json(
        { error: "order query param required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1) Try DB first (recommended)
    // prefer payment record if it exists (final status)
    const { data: paymentRow } = await sb
      .from("paymongo_payments")
      .select("*")
      .eq("order_id", order)
      .limit(1)
      .single();
    if (paymentRow) {
      return NextResponse.json({
        source: "db",
        resource: paymentRow,
        type: "payment",
      });
    }

    // otherwise fallback to stored source/resource
    const { data: dbRow, error: dbErr } = await sb
      .from("paymongo_resources")
      .select("*")
      .eq("order_id", order)
      .limit(1)
      .single();
    if (!dbErr && dbRow) {
      return NextResponse.json({
        source: "db",
        resource: dbRow,
        type: dbRow.type || "source",
      });
    }

    // 2) Fallback: scan PayMongo (existing behavior)
    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret)
      return NextResponse.json(
        { error: "PAYMONGO_SECRET_KEY not set" },
        { status: 500 }
      );
    const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

    const fetchList = async (endpoint: string) => {
      const res = await fetch(endpoint, { headers: { Authorization: auth } });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return json?.data ?? null;
    };

    const intents = await fetchList(
      "https://api.paymongo.com/v1/payment_intents?limit=100"
    );
    if (Array.isArray(intents)) {
      const found = intents.find((item: any) => {
        const md =
          item?.attributes?.metadata ??
          item?.data?.attributes?.metadata ??
          null;
        return md && String(md.order_id) === order;
      });
      if (found)
        return NextResponse.json({
          source: "paymongo",
          type: "payment_intent",
          resource: found,
        });
    }

    const sources = await fetchList(
      "https://api.paymongo.com/v1/sources?limit=100"
    );
    if (Array.isArray(sources)) {
      const found = sources.find((item: any) => {
        const md =
          item?.attributes?.metadata ??
          item?.data?.attributes?.metadata ??
          null;
        return md && String(md.order_id) === order;
      });
      if (found)
        return NextResponse.json({
          source: "paymongo",
          type: "source",
          resource: found,
        });
    }

    return NextResponse.json(
      { error: "No PayMongo resource found for order" },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("lookup-by-order error:", err);
    return NextResponse.json(
      { error: err?.message ?? "server error" },
      { status: 500 }
    );
  }
}
