import { NextResponse } from "next/server";

/**
 * POST /api/payments/customers
 * Creates a PayMongo Customer
 *
 * Request Body:
 * {
 *   email?: string,
 *   phone?: string,
 *   first_name?: string,
 *   last_name?: string,
 *   metadata?: Record<string, unknown>
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const { email, phone, first_name, last_name, metadata } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  const attrs: Record<string, unknown> = {};

  if (email) attrs.email = email;
  if (phone) {
    // Remove leading 0 from phone number for PayMongo (09123456789 -> 9123456789)
    attrs.phone =
      typeof phone === "string" && phone.startsWith("0")
        ? phone.slice(1)
        : phone;
  }
  if (first_name) attrs.first_name = first_name;
  if (last_name) attrs.last_name = last_name;
  if (metadata) attrs.metadata = metadata;

  const payload = { data: { attributes: attrs } };

  try {
    const res = await fetch("https://api.paymongo.com/v1/customers", {
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
    console.error("[payments/customers] error:", error);
    return NextResponse.json(
      { error: "Failed to create customer", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET /api/payments/customers
 * Retrieves PayMongo Customers (optional: filter by customer ID)
 */
export async function GET(req: Request) {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const url = new URL(req.url);
  const customerId = url.searchParams.get("id");

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const endpoint = customerId
      ? `https://api.paymongo.com/v1/customers/${customerId}`
      : "https://api.paymongo.com/v1/customers?limit=100";

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
    console.error("[payments/customers] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve customers", details: String(error) },
      { status: 500 },
    );
  }
}
