import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json();
  const { orderId, amount, currency = "PHP", type } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 }
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  // --- checkout_sessions branch (support single-type or "all") ---
  const CHECKOUT_SUPPORTED = [
    "gcash",
    "paymaya",
    "card",
    "grab_pay",
    "shopee_pay",
    "qrph",
  ];

  // If client requests "all" (or omits type), create a checkout session that shows all enabled methods.
  const wantAll = type === "all" || !type || body.show_all === true;

  if (wantAll || CHECKOUT_SUPPORTED.includes(type)) {
    // If the client passes explicit payment_method_types array, use it.
    // When "show all" is requested, explicitly pass the methods you want shown.
    // PayMongo requires payment_method_types for checkout_sessions.
    const DEFAULT_CHECKOUT_METHODS = ["gcash", "paymaya", "card"];
    const paymentMethodTypes = Array.isArray(body.payment_method_types)
      ? body.payment_method_types
      : wantAll
      ? DEFAULT_CHECKOUT_METHODS
      : [type];

    const attrs: any = {
      line_items: [{ currency, amount, name: orderId ?? "Order", quantity: 1 }],
      send_email_receipt: false,
      show_description: true,
      show_line_items: true,
      description: `Order ${orderId}`,
      metadata: { order_id: orderId },
    };

    // use the provided absolute URLs so PayMongo will redirect back on completion/cancel
    if (body.successUrl) attrs.success_url = body.successUrl;
    if (body.failedUrl) attrs.cancel_url = body.failedUrl;
    if (paymentMethodTypes) attrs.payment_method_types = paymentMethodTypes;

    const payload = { data: { attributes: attrs } };

    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    return NextResponse.json(json, { status: res.status || 500 });
  }

  // --- existing non‑card (sources) logic follows ---
  const srcPayload = {
    data: {
      attributes: {
        amount,
        currency,
        type,
        redirect: { success: body.successUrl, failed: body.failedUrl },
        metadata: { order_id: orderId },
      },
    },
  };

  const res = await fetch("https://api.paymongo.com/v1/sources", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(srcPayload),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.ok ? 200 : 502 });
}
