import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { orderId, amount, currency = "PHP", type, show_all, metadata } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 }
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  // checkout_sessions flow (supports explicit types or 'show_all')
  const CHECKOUT_SUPPORTED = [
    "gcash",
    "paymaya",
    "card",
    "grab_pay",
    "shopee_pay",
    "qrph",
  ];
  const wantAll = show_all === true || !type || type === "all";

  if (wantAll || CHECKOUT_SUPPORTED.includes(type)) {
    // When asking to show all, explicitly provide the list PayMongo expects
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
      metadata: metadata ?? { order_id: orderId },
    };

    if (paymentMethodTypes) attrs.payment_method_types = paymentMethodTypes;
    if (body.successUrl) attrs.success_url = body.successUrl;
    if (body.failedUrl) attrs.cancel_url = body.failedUrl;

    const payload = { data: { attributes: attrs } };

    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);
    return NextResponse.json(json, { status: res.status || 500 });
  }

  // Fallback: existing sources flow (unchanged)
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
