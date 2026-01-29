import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const {
    orderId,
    planName,
    amount,
    currency = "PHP",
    type,
    show_all,
    metadata,
    subscription_mode,
    interval = "month", // "week" | "month" | "year" (for creating plan if plan_id not provided)
    interval_count = 1, // 1-10 (for creating plan if plan_id not provided)
  } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  // SUBSCRIPTION MODE: Create Plan → Customer → Subscription → Use Checkout Session for payment
  // Note: PayMongo subscriptions require Payment Intent workflow, but we'll use Checkout Sessions
  // for initial payment setup, then convert to subscription after payment succeeds via webhook
  if (subscription_mode === true) {
    try {
      // For subscription mode, we'll still use Checkout Sessions but mark it as subscription
      // The webhook will handle creating the actual PayMongo subscription after payment succeeds
      const CHECKOUT_SUPPORTED = [
        "gcash",
        "paymaya",
        "card",
        "grab_pay",
        "shopee_pay",
        "qrph",
      ];
      const wantAll = show_all === true || !type || type === "all";

      if (wantAll || CHECKOUT_SUPPORTED.includes(type as string)) {
        // For subscriptions, only card payments are supported (e-wallets don't support recurring)
        // PayMongo subscriptions require saved payment methods that can be charged automatically
        const DEFAULT_CHECKOUT_METHODS = ["card"]; // Only cards for subscriptions

        let paymentMethodTypes: string[];
        if (Array.isArray(body.payment_method_types)) {
          // Filter to only allow card for subscriptions
          paymentMethodTypes = body.payment_method_types.filter(
            (pmt) => pmt === "card",
          );
          if (paymentMethodTypes.length === 0) {
            paymentMethodTypes = ["card"]; // Default to card if none provided
          }
        } else if (wantAll) {
          paymentMethodTypes = DEFAULT_CHECKOUT_METHODS;
        } else {
          // Only allow card for subscriptions, ignore other types
          paymentMethodTypes =
            type === "card" ? ["card"] : DEFAULT_CHECKOUT_METHODS;
        }

        const qty = body.quantity || 1;
        const displayName = planName ?? orderId ?? "Order";

        const attrs: Record<string, unknown> = {
          line_items: [{ currency, amount, name: displayName, quantity: qty }],
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: displayName,
          metadata: {
            ...(metadata as Record<string, unknown>),
            is_subscription: "true",
            subscription_interval: interval,
            subscription_interval_count: String(interval_count),
          },
        };

        if (paymentMethodTypes) attrs.payment_method_types = paymentMethodTypes;
        if (body.successUrl) attrs.success_url = body.successUrl;
        if (body.failedUrl) attrs.cancel_url = body.failedUrl;
        if (body.billing) {
          // Normalize billing object - remove leading 0 from phone number for PayMongo
          const billing = { ...body.billing } as Record<string, unknown>;
          if (billing.phone && typeof billing.phone === "string") {
            billing.phone = billing.phone.startsWith("0")
              ? billing.phone.slice(1)
              : billing.phone;
          }
          attrs.billing = billing;
        }

        const payload = { data: { attributes: attrs } };

        const res = await fetch(
          "https://api.paymongo.com/v1/checkout_sessions",
          {
            method: "POST",
            headers: {
              Authorization: auth,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const json = await res.json().catch(() => null);
        return NextResponse.json(json, { status: res.status || 500 });
      }

      return NextResponse.json(
        { error: "Subscription mode requires supported payment methods" },
        { status: 400 },
      );
    } catch (error) {
      console.error("[payments/create] subscription error:", error);
      return NextResponse.json(
        {
          error: "Failed to create subscription checkout",
          details: String(error),
        },
        { status: 500 },
      );
    }
  }

  // ONE-TIME PAYMENT MODE (existing flow)
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

    let paymentMethodTypes: string[];
    if (Array.isArray(body.payment_method_types)) {
      paymentMethodTypes = body.payment_method_types;
    } else if (wantAll) {
      paymentMethodTypes = DEFAULT_CHECKOUT_METHODS;
    } else {
      paymentMethodTypes = [type];
    }

    const qty = body.quantity || 1;
    const displayName = planName ?? orderId ?? "Order";

    const attrs: Record<string, unknown> = {
      line_items: [{ currency, amount, name: displayName, quantity: qty }],
      send_email_receipt: false,
      show_description: true,
      show_line_items: true,
      description: displayName,
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
