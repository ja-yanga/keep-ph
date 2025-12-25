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

  // helper that processes a payment resource and finalizes registration
  // Note: Payment data is stored in payment_transaction_table during finalization
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

    // Log payment for debugging (payment data will be stored in payment_transaction_table during finalization)
    console.debug("[webhook] processing payment resource:", {
      id: payId,
      orderId,
      status: attrs?.status,
      amount: attrs?.amount,
    });

    // Finalize server-side registration
    // This will create the registration, subscription, payment transaction, and assign lockers
    try {
      await finalizeRegistrationFromPayment(payRes);
    } catch (finalErr) {
      console.error(
        "[webhook] finalizeRegistrationFromPayment error:",
        finalErr,
      );
      // Re-throw to let caller handle it
      throw finalErr;
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
    const locationId = meta.location_id ?? "";
    const planId = meta.plan_id ?? "";
    const lockerQty = Math.max(1, Number(meta.locker_qty ?? 1));
    const months = Math.max(1, Number(meta.months ?? 1));
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
      // 1) Check if payment transaction already exists (idempotency)
      // Use limit(1) to avoid race condition errors (PGRST116)
      const { data: existingPayment } = await sb
        .from("payment_transaction_table")
        .select("mailroom_registration_id")
        .eq("payment_transaction_order_id", orderId)
        .order("payment_transaction_created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPayment?.mailroom_registration_id) {
        // Check if registration exists and is active
        const { data: existingReg } = await sb
          .from("mailroom_registration_table")
          .select("mailroom_registration_id")
          .eq(
            "mailroom_registration_id",
            existingPayment.mailroom_registration_id,
          )
          .eq("mailroom_registration_status", true)
          .limit(1)
          .maybeSingle();

        if (existingReg) {
          console.info("[webhook] registration already finalized", {
            orderId,
            registrationId: existingReg.mailroom_registration_id,
          });
          return;
        }
      }

      // 2) Check available lockers
      const { data: availableLockers } = await sb
        .from("location_locker_table")
        .select("location_locker_id")
        .eq("mailroom_location_id", locationId)
        .eq("location_locker_is_available", true)
        .limit(lockerQty);

      if (!availableLockers || availableLockers.length < lockerQty) {
        console.error("[webhook] insufficient lockers for order", {
          orderId,
          available: availableLockers?.length ?? 0,
          needed: lockerQty,
        });
        return;
      }

      // 3) Generate unique mailroom code
      let mailroomCode = "";
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const code = `KPH-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const { data: existing } = await sb
          .from("mailroom_registration_table")
          .select("mailroom_registration_id")
          .eq("mailroom_registration_code", code)
          .limit(1)
          .maybeSingle();
        if (!existing) {
          mailroomCode = code;
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        console.error("[webhook] failed to generate unique mailroom_code");
        return;
      }

      // 4) Create registration
      // Check again for safety before creating
      const { data: checkAgainReg } = await sb
        .from("payment_transaction_table")
        .select("mailroom_registration_id")
        .eq("payment_transaction_order_id", orderId)
        .limit(1)
        .maybeSingle();

      if (checkAgainReg?.mailroom_registration_id) {
        console.info("[webhook] registration created by concurrent request", {
          orderId,
        });
        return;
      }

      const { data: registration, error: regErr } = await sb
        .from("mailroom_registration_table")
        .insert([
          {
            user_id: userId,
            mailroom_location_id: locationId,
            mailroom_plan_id: planId,
            mailroom_registration_code: mailroomCode,
            mailroom_registration_status: true,
          },
        ])
        .select()
        .single();

      if (regErr || !registration) {
        console.error("[webhook] registration insert failed", regErr);
        return;
      }

      // 5) Create subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      await sb.from("subscription_table").insert([
        {
          mailroom_registration_id: registration.mailroom_registration_id,
          subscription_billing_cycle: months === 12 ? "YEARLY" : "MONTHLY",
          subscription_expires_at: expiresAt.toISOString(),
        },
      ]);

      // 6) Create payment transaction
      const amount = Number(attrs?.amount ?? 0) / 100; // Convert from minor units

      // Use maybeSingle to check for existence one last time before inserting
      // This is still not 100% atomic but much better with the limit(1) fix
      const { error: transErr } = await sb
        .from("payment_transaction_table")
        .insert([
          {
            mailroom_registration_id: registration.mailroom_registration_id,
            payment_transaction_amount: amount,
            payment_transaction_status: "PAID",
            payment_transaction_type: "SUBSCRIPTION",
            payment_transaction_reference_id: paymentId,
            payment_transaction_order_id: orderId,
          },
        ]);

      if (transErr) {
        console.warn(
          "[webhook] payment transaction insert failed (possibly duplicate)",
          transErr,
        );
        // If it's a unique constraint error (if applied), we can ignore it
      }

      // 7) Assign lockers: mark them unavailable and insert assignment rows
      const lockerIds = availableLockers.map(
        (l: { location_locker_id: string }) => l.location_locker_id,
      );
      await sb
        .from("location_locker_table")
        .update({ location_locker_is_available: false })
        .in("location_locker_id", lockerIds);

      const assignments = lockerIds.map((lockerId: string) => ({
        mailroom_registration_id: registration.mailroom_registration_id,
        location_locker_id: lockerId,
        mailroom_assigned_locker_status: "Normal" as const,
      }));
      await sb.from("mailroom_assigned_locker_table").insert(assignments);

      console.info("[webhook] finalized registration from payment", {
        orderId,
        registrationId: registration.mailroom_registration_id,
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
