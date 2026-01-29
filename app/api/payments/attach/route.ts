import { NextResponse } from "next/server";

/**
 * POST /api/payments/attach
 * Attaches a payment method to a payment intent (used for PayMongo subscription flow).
 * Returns next_action_url for 3DS redirect, or success if no further action needed.
 *
 * Request Body:
 * {
 *   payment_intent_id: string,
 *   payment_method_id: string,
 *   return_url?: string (where to redirect after 3DS)
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const { payment_intent_id, payment_method_id, return_url } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  if (!payment_intent_id || !payment_method_id) {
    return NextResponse.json(
      { error: "payment_intent_id and payment_method_id are required" },
      { status: 400 },
    );
  }

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  const attrs: Record<string, unknown> = {
    payment_method: payment_method_id,
  };
  if (return_url) attrs.return_url = return_url;

  const payload = { data: { attributes: attrs } };

  try {
    const res = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(
        payment_intent_id as string,
      )}/attach`,
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

    if (!res.ok) {
      return NextResponse.json(json ?? { error: "Attach failed" }, {
        status: res.status || 500,
      });
    }

    const data = json?.data;
    const attributes = data?.attributes ?? {};
    const status = attributes?.status;
    const nextAction = attributes?.next_action;
    const nextActionUrl =
      nextAction?.redirect?.url ??
      nextAction?.url ??
      (typeof nextAction === "string" ? nextAction : null);

    return NextResponse.json({
      success: true,
      status,
      next_action_url: nextActionUrl || null,
      payment_intent: json?.data,
    });
  } catch (error) {
    console.error("[payments/attach] error:", error);
    return NextResponse.json(
      { error: "Failed to attach payment method", details: String(error) },
      { status: 500 },
    );
  }
}
