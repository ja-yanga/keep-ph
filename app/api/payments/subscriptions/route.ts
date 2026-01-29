import { NextResponse } from "next/server";

/**
 * POST /api/payments/subscriptions
 * Creates a PayMongo Subscription linked to a Plan
 *
 * Request Body:
 * {
 *   plan_id: string (PayMongo Plan ID, required),
 *   customer_id?: string (PayMongo Customer ID, optional),
 *   payment_method_id?: string (PayMongo Payment Method ID, optional),
 *   billing?: {
 *     name?: string,
 *     email?: string,
 *     phone?: string,
 *     address?: {
 *       line1?: string,
 *       line2?: string,
 *       city?: string,
 *       state?: string,
 *       postal_code?: string,
 *       country?: string
 *     }
 *   },
 *   metadata?: Record<string, unknown> (e.g., order_id, user_id, etc.)
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const { plan_id, customer_id, payment_method_id, billing, metadata } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  if (!plan_id || typeof plan_id !== "string") {
    return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  const attrs: Record<string, unknown> = {
    plan: plan_id,
  };

  if (customer_id) attrs.customer = customer_id;
  if (payment_method_id) attrs.payment_method = payment_method_id;
  if (billing) {
    // Normalize billing object - remove leading 0 from phone number for PayMongo
    const normalizedBilling = { ...billing } as Record<string, unknown>;
    if (
      normalizedBilling.phone &&
      typeof normalizedBilling.phone === "string"
    ) {
      normalizedBilling.phone = normalizedBilling.phone.startsWith("0")
        ? normalizedBilling.phone.slice(1)
        : normalizedBilling.phone;
    }
    attrs.billing = normalizedBilling;
  }
  if (metadata) attrs.metadata = metadata;

  const payload = { data: { attributes: attrs } };

  try {
    const res = await fetch("https://api.paymongo.com/v1/subscriptions", {
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
  } catch (error) {
    console.error("[payments/subscriptions] error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET /api/payments/subscriptions
 * Retrieves PayMongo Subscriptions (optional: filter by subscription ID)
 */
export async function GET(req: Request) {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get("id");

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const endpoint = subscriptionId
      ? `https://api.paymongo.com/v1/subscriptions/${subscriptionId}`
      : "https://api.paymongo.com/v1/subscriptions?limit=100";

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: auth,
        accept: "application/json",
      },
    });

    const json = await res.json().catch(() => null);
    return NextResponse.json(json, { status: res.status || 500 });
  } catch (error) {
    console.error("[payments/subscriptions] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve subscriptions", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/payments/subscriptions
 * Updates a PayMongo Subscription (e.g., cancel, pause, resume)
 *
 * Request Body:
 * {
 *   subscription_id: string (required),
 *   action?: "cancel" | "pause" | "resume",
 *   metadata?: Record<string, unknown>
 * }
 */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const { subscription_id, action, metadata } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  if (!subscription_id || typeof subscription_id !== "string") {
    return NextResponse.json(
      { error: "subscription_id is required" },
      { status: 400 },
    );
  }

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  const attrs: Record<string, unknown> = {};
  if (action) attrs.action = action;
  if (metadata) attrs.metadata = metadata;

  const payload = { data: { attributes: attrs } };

  try {
    const res = await fetch(
      `https://api.paymongo.com/v1/subscriptions/${subscription_id}`,
      {
        method: "PATCH",
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
  } catch (error) {
    console.error("[payments/subscriptions] error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription", details: String(error) },
      { status: 500 },
    );
  }
}
