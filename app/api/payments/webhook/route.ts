import { NextResponse } from "next/server";
import { upsertPaymentResource } from "@/app/actions/post";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  console.debug(
    "[webhook] payload:",
    JSON.stringify(payload?.data ?? payload, null, 2),
  );

  const data = payload?.data;
  if (!data) {
    void logApiError(req, {
      status: 400,
      message: "Webhook payload missing data",
    });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

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
              void logApiError(req, {
                status: 500,
                message: "upsert_nested_failed",
                error: err,
              });
              return NextResponse.json(
                { error: "upsert_nested_failed", details: String(err) },
                { status: 500 },
              );
            }
          }
        }

        // Log activity after successful payment processing
        if (
          eventType === "checkout_session.payment.paid" &&
          payments.length > 0
        ) {
          try {
            const firstPayment = payments[0];
            const meta = firstPayment?.attributes?.metadata;

            if (meta?.user_id && meta?.location_id && meta?.plan_id) {
              const supabase = createSupabaseServiceClient();

              // Fetch location and plan names for logging
              const { data: locationData } = await supabase
                .from("mailroom_location_table")
                .select("mailroom_location_name")
                .eq("mailroom_location_id", meta.location_id)
                .single();

              const { data: planData } = await supabase
                .from("mailroom_plan_table")
                .select("mailroom_plan_name")
                .eq("mailroom_plan_id", meta.plan_id)
                .single();

              await logActivity({
                userId: meta.user_id,
                action: "PURCHASE",
                type: "USER_REQUEST_OTHERS",
                entityType: "SUBSCRIPTION",
                entityId: meta.user_id,
                details: {
                  mailroom_locker_qty:
                    String(meta.locker_qty ?? 1) + " Lockers",
                  mailroom_location_name:
                    locationData?.mailroom_location_name || "Unknown",
                  mailroom_plan_name: planData?.mailroom_plan_name || "Unknown",
                },
              });

              console.log("[webhook] ✅ Payment activity logged successfully");
            } else {
              console.debug(
                "[webhook] Skipping log: missing required metadata",
              );
            }
          } catch (logErr) {
            console.error("[webhook] Payment activity log failed:", logErr);
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
    void logApiError(req, {
      status: 500,
      message: err instanceof Error ? err.message : String(err),
      error: err,
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
