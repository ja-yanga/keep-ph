import { NextResponse } from "next/server";
import {
  upsertPaymentResource,
  handleSubscriptionWebhook,
  handleSubscriptionPaymentWebhook,
  finalizeRegistrationFromSubscriptionInvoice,
} from "@/app/actions/post";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  console.debug(
    "[webhook] payload:",
    JSON.stringify(payload?.data ?? payload, null, 2),
  );

  const data = payload?.data;
  if (!data) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    // 1) direct payment resource (some webhooks may send this shape)
    if (data.type === "payment") {
      await upsertPaymentResource(data);
    } else if (data.type === "subscription") {
      // Handle direct subscription resource
      await handleSubscriptionWebhook(data);
    } else if (data.type === "event") {
      // 2) event wrapper (checkout_session.payment.paid, subscription.activated, etc.)
      const eventType = data?.attributes?.type;
      const nested = data?.attributes?.data; // the nested resource

      // Handle subscription events
      if (
        eventType?.startsWith("subscription.") &&
        nested?.type === "subscription"
      ) {
        try {
          await handleSubscriptionWebhook(nested);
        } catch (err) {
          console.error("[webhook] handleSubscriptionWebhook failed:", err);
          return NextResponse.json(
            { error: "subscription_webhook_failed", details: String(err) },
            { status: 500 },
          );
        }
      }
      // subscription.invoice.paid: first payment for PayMongo subscription → create registration
      else if (
        eventType === "subscription.invoice.paid" &&
        nested?.type === "invoice"
      ) {
        try {
          await finalizeRegistrationFromSubscriptionInvoice(nested);
        } catch (err) {
          console.error(
            "[webhook] finalizeRegistrationFromSubscriptionInvoice failed:",
            err,
          );
          return NextResponse.json(
            {
              error: "subscription_invoice_finalize_failed",
              details: String(err),
            },
            { status: 500 },
          );
        }
      }
      // Handle subscription payment events (recurring payments)
      else if (
        eventType === "subscription.payment_succeeded" ||
        eventType === "subscription.payment_failed"
      ) {
        // The nested resource might be a payment or subscription
        if (nested?.type === "payment") {
          try {
            await handleSubscriptionPaymentWebhook(nested);
          } catch (err) {
            console.error(
              "[webhook] handleSubscriptionPaymentWebhook failed:",
              err,
            );
            return NextResponse.json(
              {
                error: "subscription_payment_webhook_failed",
                details: String(err),
              },
              { status: 500 },
            );
          }
        } else if (nested?.type === "subscription") {
          // Some subscription payment events include the subscription resource
          try {
            await handleSubscriptionWebhook(nested);
          } catch (err) {
            console.error("[webhook] handleSubscriptionWebhook failed:", err);
            return NextResponse.json(
              { error: "subscription_webhook_failed", details: String(err) },
              { status: 500 },
            );
          }
        }
      }
      // Handle checkout_session events (one-time payments)
      else if (nested?.type === "checkout_session") {
        const payments = nested?.attributes?.payments ?? [];
        if (!Array.isArray(payments) || payments.length === 0) {
          console.debug("[webhook] checkout_session has no payments array");
        } else {
          for (const p of payments) {
            try {
              await upsertPaymentResource(p);
            } catch (err) {
              console.error("[webhook] upsert nested payment failed:", err);
              return NextResponse.json(
                { error: "upsert_nested_failed", details: String(err) },
                { status: 500 },
              );
            }
          }
        }
      } else if (nested?.type === "payment") {
        // event wrapping a single payment resource
        await upsertPaymentResource(nested);
      } else {
        console.debug(
          "[webhook] unhandled event nested type:",
          nested?.type,
          "eventType:",
          eventType,
        );
      }
    } else {
      console.debug("[webhook] unhandled data.type:", data.type);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
