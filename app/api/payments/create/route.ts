import { NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const {
      orderId,
      planName,
      amount,
      currency = "PHP",
      type,
      show_all,
      metadata,
    } = body;

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret) {
      void logApiError(req, {
        status: 500,
        message: "PAYMONGO_SECRET_KEY missing",
        errorCode: "PAYMENT_ERROR",
      });
      return NextResponse.json(
        { error: "PAYMONGO_SECRET_KEY missing" },
        { status: 500 },
      );
    }

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
      const checkoutStatus = res.status || 500;
      if (checkoutStatus >= 500) {
        void logApiError(req, {
          status: checkoutStatus,
          message: "PayMongo checkout_sessions request failed",
          errorCode: "PAYMENT_ERROR",
          errorDetails: { paymongoStatus: res.status },
        });
      }
      return NextResponse.json(json, { status: checkoutStatus });
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
    const status = res.ok ? 200 : 502;
    if (status >= 500) {
      void logApiError(req, {
        status: 502,
        message: "PayMongo sources request failed",
        errorCode: "PAYMENT_ERROR",
        errorDetails: { paymongoStatus: res.status },
      });
    }
    return NextResponse.json(json, { status });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
