import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  console.debug(
    "[webhook] payload:",
    JSON.stringify(payload?.data ?? payload, null, 2),
  );

  const sb = createSupabaseServiceClient();
  const data = payload?.data;
  if (!data) return NextResponse.json({ ok: false }, { status: 400 });

  // helper that upserts a payment resource (shape: { id, type: 'payment', attributes: { ... } })
  async function upsertPaymentResource(payRes: {
    id?: string;
    attributes?: {
      source?: { id?: string };
      status?: string;
      amount?: number;
      currency?: string;
      metadata?: { order_id?: string };
    };
  }) {
    const payId = payRes?.id;
    const attrs = payRes?.attributes ?? {};
    const metadata = attrs?.metadata ?? {};
    const orderId = metadata?.order_id ?? null;

    const upsertRes = await sb.from("paymongo_payments").upsert(
      {
        id: payId,
        source_id: attrs?.source?.id ?? null,
        order_id: orderId,
        status: attrs?.status ?? null,
        amount: attrs?.amount ?? null,
        currency: attrs?.currency ?? null,
        raw: payRes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    console.debug("[webhook] upsertPaymentResource result:", {
      id: payId,
      data: Array.isArray(upsertRes?.data)
        ? (upsertRes.data as unknown[]).slice(0, 5)
        : (upsertRes?.data ?? null),
      error: upsertRes?.error,
    });

    if (upsertRes?.error) {
      throw upsertRes.error;
    }

    // finalize server-side registration immediately after a successful upsert
    try {
      await finalizeRegistrationFromPayment(payRes);
    } catch (finalErr) {
      console.error(
        "[webhook] finalizeRegistrationFromPayment error:",
        finalErr,
      );
      // don't throw here — we already upserted payment; finalize is best-effort and idempotent
    }

    return { id: payId, orderId };
  }

  async function finalizeRegistrationFromPayment(payRes: {
    id?: string;
    attributes?: {
      metadata?: {
        order_id?: string;
        user_id?: string;
        full_name?: string;
        email?: string;
        mobile?: string;
        location_id?: string;
        plan_id?: string;
        locker_qty?: number;
        months?: number;
        notes?: string;
      };
    };
  }) {
    const attrs = payRes?.attributes ?? {};
    const meta = attrs?.metadata ?? {};
    const orderId = meta?.order_id ?? null;
    if (!orderId) {
      console.debug("[webhook] finalize skipped: no order_id in metadata");
      return;
    }

    const userId = meta.user_id ?? "";
    const fullName = meta.full_name ?? "";
    const email = meta.email ?? "";
    const mobile = meta.mobile ?? "";
    const locationId = meta.location_id ?? "";
    const planId = meta.plan_id ?? "";
    const lockerQty = Math.max(1, Number(meta.locker_qty ?? 1));
    const months = Math.max(1, Number(meta.months ?? 1));
    const notes = meta.notes ?? "";
    const paymentId = payRes?.id ?? null;

    if (!userId || !locationId || !planId) {
      console.warn("[webhook] finalize skipped: missing required metadata", {
        orderId,
        userId,
        locationId,
        planId,
      });
      return;
    }

    try {
      // 1) Check if registration already finalized (idempotency)
      const { data: existing } = await sb
        .from("mailroom_registrations")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existing && existing.paid) {
        console.info("[webhook] registration already finalized", {
          orderId,
          registrationId: existing.id,
        });
        return;
      }

      // 2) Check available lockers
      const { data: availableLockers } = await sb
        .from("location_lockers")
        .select("id")
        .eq("location_id", locationId)
        .eq("is_available", true)
        .limit(lockerQty);

      if (!availableLockers || availableLockers.length < lockerQty) {
        console.error("[webhook] insufficient lockers for order", {
          orderId,
          available: availableLockers?.length ?? 0,
          needed: lockerQty,
        });
        // Optionally notify admin / store a flag; return 200 so webhook isn't retried endlessly
        return;
      }

      // 3) Upsert registration using order_id for idempotency
      const insertPayload = {
        user_id: userId,
        location_id: locationId,
        plan_id: planId,
        locker_qty: lockerQty,
        months,
        notes,
        full_name: fullName,
        email,
        mobile,
        order_id: orderId,
        paid: true,
        paymongo_payment_id: paymentId,
        mailroom_code: null,
        mailroom_status: true,
      };

      const { data: upserted, error: upsertErr } = await sb
        .from("mailroom_registrations")
        .upsert([insertPayload], { onConflict: "order_id" })
        .select()
        .maybeSingle();

      if (upsertErr) {
        console.error("[webhook] registration upsert failed", upsertErr);
        return;
      }
      const registration = upserted;

      // 4) Generate unique mailroom_code if missing (best-effort)
      if (!registration?.mailroom_code) {
        let attempts = 0;
        let created = false;
        while (!created && attempts < 6) {
          const code = `KPH-${Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase()}`;
          const { error: codeErr } = await sb
            .from("mailroom_registrations")
            .update({ mailroom_code: code })
            .eq("id", registration.id)
            .is("mailroom_code", null);
          if (!codeErr) created = true;
          attempts++;
        }
        if (!created) {
          console.error(
            "[webhook] failed to generate unique mailroom_code for registration",
            registration.id,
          );
        }
      }

      // 5) Assign lockers: mark them unavailable and insert assignment rows
      const lockerIds = availableLockers.map((l: { id: string }) => l.id);
      await sb
        .from("location_lockers")
        .update({ is_available: false })
        .in("id", lockerIds);

      const assignments = lockerIds.map((lockerId: string) => ({
        registration_id: registration.id,
        locker_id: lockerId,
        status: "Normal",
      }));
      await sb.from("mailroom_assigned_lockers").insert(assignments);

      console.info("[webhook] finalized registration from payment", {
        orderId,
        registrationId: registration.id,
      });
    } catch (err) {
      console.error("[webhook] finalizeRegistrationFromPayment error:", err);
    }
  }

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
