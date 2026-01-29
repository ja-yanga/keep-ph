import { NextResponse } from "next/server";

/**
 * POST /api/payments/plans
 * Creates a PayMongo Plan for recurring subscriptions
 *
 * Request Body:
 * {
 *   amount: number (in cents, minimum 2000),
 *   currency: "PHP" (default),
 *   interval: "week" | "month" | "year",
 *   interval_count: number (1-10, default: 1),
 *   name?: string,
 *   description?: string,
 *   metadata?: Record<string, unknown>
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const {
    amount,
    currency = "PHP",
    interval = "month",
    interval_count = 1,
    name,
    description,
    metadata,
  } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  // Validate amount (minimum 2000 cents = 20 PHP)
  if (!amount || typeof amount !== "number" || amount < 2000) {
    return NextResponse.json(
      { error: "Amount must be at least 2000 cents (20 PHP)" },
      { status: 400 },
    );
  }

  // Validate interval; PayMongo expects "weekly"|"monthly"|"yearly"
  const validIntervals = [
    "week",
    "month",
    "year",
    "weekly",
    "monthly",
    "yearly",
  ];
  const raw = String(interval).toLowerCase();
  if (!validIntervals.includes(raw)) {
    return NextResponse.json(
      { error: "Interval must be one of: week, month, year" },
      { status: 400 },
    );
  }
  const intervalMap: Record<string, string> = {
    week: "weekly",
    month: "monthly",
    year: "yearly",
    weekly: "weekly",
    monthly: "monthly",
    yearly: "yearly",
  };
  const paymongoInterval = intervalMap[raw] ?? "monthly";

  // Validate interval_count (1-10)
  const count = Number(interval_count);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json(
      { error: "interval_count must be an integer between 1 and 10" },
      { status: 400 },
    );
  }

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  const attrs: Record<string, unknown> = {
    amount,
    currency,
    interval: paymongoInterval,
    interval_count: count,
  };

  if (name) attrs.name = name;
  if (description) attrs.description = description;
  if (metadata) attrs.metadata = metadata;

  const payload = { data: { attributes: attrs } };

  try {
    const res = await fetch("https://api.paymongo.com/v1/subscriptions/plans", {
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
    console.error("[payments/plans] error:", error);
    return NextResponse.json(
      { error: "Failed to create plan", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET /api/payments/plans
 * Retrieves PayMongo Plans (optional: filter by plan ID)
 */
export async function GET(req: Request) {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const url = new URL(req.url);
  const planId = url.searchParams.get("id");

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const endpoint = planId
      ? `https://api.paymongo.com/v1/subscriptions/plans/${planId}`
      : "https://api.paymongo.com/v1/subscriptions/plans?limit=100";

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
    console.error("[payments/plans] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve plans", details: String(error) },
      { status: 500 },
    );
  }
}
