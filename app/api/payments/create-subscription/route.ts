import { NextResponse } from "next/server";

/**
 * POST /api/payments/create-subscription
 * Complete subscription flow: Plan → Customer → Subscription → Payment Intent
 * This endpoint handles the full PayMongo subscription workflow for mailroom registration
 *
 * Request Body:
 * {
 *   orderId: string,
 *   planName: string,
 *   amount: number (in cents),
 *   interval: "week" | "month" | "year",
 *   interval_count: number (1-10),
 *   email: string,
 *   phone?: string,
 *   first_name?: string,
 *   last_name?: string,
 *   metadata: Record<string, unknown>,
 *   successUrl?: string,
 *   failedUrl?: string
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const {
    planName,
    amount,
    interval = "month",
    interval_count = 1,
    email,
    phone,
    first_name,
    last_name,
    metadata,
    successUrl,
    failedUrl,
  } = body;

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    // Step 1: Create or get Plan
    let planId: string | undefined = (metadata as Record<string, unknown>)
      ?.paymongo_plan_id as string | undefined;

    if (!planId && amount !== undefined && amount !== null) {
      const amountNum = Number(amount);
      // PayMongo requires minimum 2000 centavos (20 PHP) per plan
      if (!Number.isFinite(amountNum) || amountNum < 2000) {
        return NextResponse.json(
          {
            error: "Plan amount must be at least 20 PHP (2000 centavos)",
            details: { amount: amountNum },
          },
          { status: 400 },
        );
      }

      // PayMongo expects "monthly" | "yearly" | "weekly", not "month" | "year" | "week"
      const intervalMap: Record<string, string> = {
        month: "monthly",
        year: "yearly",
        week: "weekly",
        monthly: "monthly",
        yearly: "yearly",
        weekly: "weekly",
      };
      const paymongoInterval =
        intervalMap[String(interval).toLowerCase()] || "monthly";

      const planAttrs: Record<string, unknown> = {
        name:
          planName && String(planName).trim()
            ? String(planName).trim()
            : "Mailroom Plan",
        amount: amountNum,
        currency: "PHP",
        interval: paymongoInterval,
        interval_count: Math.min(10, Math.max(1, Number(interval_count) || 1)),
      };

      if (metadata && typeof metadata === "object")
        planAttrs.metadata = metadata;

      const planPayload = { data: { attributes: planAttrs } };

      const planRes = await fetch(
        "https://api.paymongo.com/v1/subscriptions/plans",
        {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(planPayload),
        },
      );

      const planJson = await planRes.json().catch(() => null);
      if (!planRes.ok || !planJson?.data?.id) {
        const firstError = planJson?.errors?.[0] as
          | { detail?: string }
          | undefined;
        let message = "Failed to create plan";
        if (typeof firstError?.detail === "string") {
          message = firstError.detail;
        } else if (
          Array.isArray(planJson?.errors) &&
          planJson.errors.length > 0
        ) {
          message = String(firstError?.detail ?? "Failed to create plan");
        }
        return NextResponse.json(
          { error: message, details: planJson },
          { status: planRes.status || 500 },
        );
      }

      planId = planJson.data.id;
    }

    if (!planId) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 },
      );
    }

    // Step 2: Create Customer
    const customerAttrs: Record<string, unknown> = {};
    if (email) customerAttrs.email = email;
    if (phone) {
      // Remove leading 0 from phone number for PayMongo (09123456789 -> 9123456789)
      customerAttrs.phone =
        typeof phone === "string" && phone.startsWith("0")
          ? phone.slice(1)
          : phone;
    }
    if (first_name) customerAttrs.first_name = first_name;
    if (last_name) customerAttrs.last_name = last_name;
    if (metadata) customerAttrs.metadata = metadata;

    const customerPayload = { data: { attributes: customerAttrs } };

    const customerRes = await fetch("https://api.paymongo.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(customerPayload),
    });

    const customerJson = await customerRes.json().catch(() => null);
    if (!customerRes.ok || !customerJson?.data?.id) {
      return NextResponse.json(
        { error: "Failed to create customer", details: customerJson },
        { status: customerRes.status || 500 },
      );
    }

    const customerId = customerJson.data.id;

    // Step 3: Create Subscription
    const subscriptionAttrs: Record<string, unknown> = {
      plan: planId,
      customer: customerId,
    };

    if (metadata) subscriptionAttrs.metadata = metadata;

    const subscriptionPayload = { data: { attributes: subscriptionAttrs } };

    const subscriptionRes = await fetch(
      "https://api.paymongo.com/v1/subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      },
    );

    const subscriptionJson = await subscriptionRes.json().catch(() => null);
    if (!subscriptionRes.ok || !subscriptionJson?.data) {
      return NextResponse.json(
        { error: "Failed to create subscription", details: subscriptionJson },
        { status: subscriptionRes.status || 500 },
      );
    }

    const subscription = subscriptionJson.data;
    const latestInvoice = subscription.attributes?.latest_invoice;
    const paymentIntentId =
      latestInvoice?.payment_intent?.id ||
      latestInvoice?.payment_intent?.data?.id;

    if (!paymentIntentId) {
      return NextResponse.json(
        {
          error: "No payment intent found in subscription",
          subscription: subscriptionJson,
        },
        { status: 500 },
      );
    }

    // Step 4: Create Payment Method (for card/Maya)
    // Note: For now, we'll return the payment intent ID so the frontend can handle
    // payment method creation and attachment using PayMongo's frontend SDK

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      customer_id: customerId,
      plan_id: planId,
      payment_intent_id: paymentIntentId,
      subscription: subscriptionJson,
      // Include redirect URLs for payment method setup
      successUrl: successUrl,
      failedUrl: failedUrl,
    });
  } catch (error) {
    console.error("[payments/create-subscription] error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription", details: String(error) },
      { status: 500 },
    );
  }
}
