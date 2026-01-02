import { NextResponse } from "next/server";
import { upsertPaymentResource } from "@/app/actions/post";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  console.debug(
    "[webhook] payload:",
    JSON.stringify(payload?.data ?? payload, null, 2),
  );

  const data = payload?.data;
  if (!data) return NextResponse.json({ ok: false }, { status: 400 });

  /**
   * Creates a mailroom registration with locker assignments.
   * @param payRes
   */

  try {
    // 1) direct payment resource (some webhooks may send this shape)
    if (data.type === "payment") {
      await upsertPaymentResource(data);
    } else if (data.type === "event") {
      // 2) event wrapper (checkout_session.payment.paid etc.)
      const eventType = data?.attributes?.type;
      const nested = data?.attributes?.data; // the nested resource (checkout_session)
      if (nested?.type === "checkout_session") {
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

    // existing finalize logic (if you want to finalize registrations here, you can
    // extract the order_id from inserted payments as needed)
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
