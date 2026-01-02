import { NextResponse } from "next/server";
import { getPaymentTransactionByOrder } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order = url.searchParams.get("order");
    if (!order) {
      return NextResponse.json(
        { error: "order query param required" },
        { status: 400 },
      );
    }

    // 1) Try DB first (recommended) using RPC
    const paymentTransaction = await getPaymentTransactionByOrder(order);

    if (paymentTransaction) {
      return NextResponse.json({
        source: "db",
        resource: paymentTransaction,
        type: "payment_transaction",
      });
    }

    // 2) Fallback: scan PayMongo (existing behavior)
    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret)
      return NextResponse.json(
        { error: "PAYMONGO_SECRET_KEY not set" },
        { status: 500 },
      );
    const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

    const fetchList = async (endpoint: string) => {
      const res = await fetch(endpoint, { headers: { Authorization: auth } });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return json?.data ?? null;
    };

    const intents = await fetchList(
      "https://api.paymongo.com/v1/payment_intents?limit=100",
    );
    if (Array.isArray(intents)) {
      const found = intents.find(
        (item: {
          attributes?: { metadata?: { order_id?: unknown } };
          data?: { attributes?: { metadata?: { order_id?: unknown } } };
        }) => {
          const md =
            item?.attributes?.metadata ??
            item?.data?.attributes?.metadata ??
            null;
          return md && String(md.order_id) === order;
        },
      );
      if (found)
        return NextResponse.json({
          source: "paymongo",
          type: "payment_intent",
          resource: found,
        });
    }

    const sources = await fetchList(
      "https://api.paymongo.com/v1/sources?limit=100",
    );
    if (Array.isArray(sources)) {
      const found = sources.find(
        (item: {
          attributes?: { metadata?: { order_id?: unknown } };
          data?: { attributes?: { metadata?: { order_id?: unknown } } };
        }) => {
          const md =
            item?.attributes?.metadata ??
            item?.data?.attributes?.metadata ??
            null;
          return md && String(md.order_id) === order;
        },
      );
      if (found)
        return NextResponse.json({
          source: "paymongo",
          type: "source",
          resource: found,
        });
    }

    return NextResponse.json(
      { error: "No PayMongo resource found for order" },
      { status: 404 },
    );
  } catch (err: unknown) {
    console.error("lookup-by-order error:", err);
    const errorMessage = err instanceof Error ? err.message : "server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
