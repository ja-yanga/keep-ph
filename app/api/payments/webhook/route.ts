import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const raw = await req.text();
  const sigHeader =
    req.headers.get("paymongo-signature") ||
    req.headers.get("Paymongo-Signature") ||
    "";

  console.debug("[paymongo webhook] raw:", raw);
  console.debug("[paymongo webhook] sig header:", sigHeader);

  try {
    // lazy create supabase service client and validate env
    const getSupabase = () => {
      const url = process.env.SUPABASE_URL;
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SERVICE_KEY;
      if (!url || !key) return null;
      return createClient(url, key);
    };
    const sb = getSupabase();
    if (!sb) {
      console.error(
        "[paymongo webhook] missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY or SUPABASE_URL"
      );
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) and SUPABASE_URL required",
        },
        { status: 500 }
      );
    }

    // Verify signature if webhook secret is configured
    const webhookSecret =
      process.env.PAYMONGO_WEBHOOK_SECRET ||
      process.env.PAYMONGO_WEBHOOK_SECRET?.trim();

    if (webhookSecret) {
      // build map from header kv pairs
      const parts = sigHeader
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const hdrMap: Record<string, string> = {};
      for (const p of parts) {
        const [k, ...rest] = p.split("=");
        if (!k) continue;
        hdrMap[k.trim()] = rest
          .join("=")
          .replace(/^"(.*)"$/, "$1")
          .trim();
      }

      // candidate signature strings from common keys
      const candidates = [
        hdrMap["v1"],
        hdrMap["te"],
        hdrMap["sha256"],
        hdrMap["sig"],
        hdrMap["signature"],
      ].filter(Boolean) as string[];

      const ts = hdrMap["t"] || hdrMap["timestamp"] || "";

      const hmac = (input: string) =>
        crypto.createHmac("sha256", webhookSecret).update(input).digest();

      const expectedRaw = hmac(raw);
      const expectedWithTs = ts ? hmac(`${ts}.${raw}`) : null;

      let valid = false;
      for (const c of candidates) {
        let sigBuf: Buffer | null = null;
        // try hex
        if (/^[0-9a-fA-F]+$/.test(c)) {
          try {
            sigBuf = Buffer.from(c, "hex");
          } catch {}
        }
        // try base64 fallback
        if (!sigBuf) {
          try {
            sigBuf = Buffer.from(c, "base64");
          } catch {}
        }
        if (!sigBuf) continue;

        try {
          if (
            sigBuf.length === expectedRaw.length &&
            crypto.timingSafeEqual(sigBuf, expectedRaw)
          ) {
            valid = true;
            break;
          }
          if (
            expectedWithTs &&
            sigBuf.length === expectedWithTs.length &&
            crypto.timingSafeEqual(sigBuf, expectedWithTs)
          ) {
            valid = true;
            break;
          }
        } catch (e) {
          // ignore and continue
        }
      }

      console.debug("[paymongo webhook] signature verification result:", {
        valid,
        ts,
        candidates,
      });
      if (!valid) {
        console.warn("[paymongo webhook] signature mismatch", {
          // log a truncated expected hex for debugging only
          expectedRaw: expectedRaw.toString("hex").slice(0, 32),
          expectedWithTs: expectedWithTs
            ? expectedWithTs.toString("hex").slice(0, 32)
            : null,
          candidates,
        });
        return NextResponse.json(
          { error: "invalid signature" },
          { status: 400 }
        );
      }
      console.debug("[paymongo webhook] signature verified");
    } else {
      console.debug(
        "[paymongo webhook] PAYMONGO_WEBHOOK_SECRET not set — skipping signature verification"
      );
    }

    const body = JSON.parse(raw);

    // Resolve resource id/type from event
    const eventType = body?.data?.attributes?.type ?? body?.type ?? "";
    const nested = body?.data?.attributes?.data ?? null;
    const resourceId = nested?.id ?? body?.data?.id ?? null;
    const resourceKind =
      nested?.type ??
      (eventType.includes("payment_intent")
        ? "payment_intent"
        : eventType.includes("source")
        ? "source"
        : null);

    console.debug(
      "[paymongo webhook] eventType:",
      eventType,
      "resolvedResource:",
      { resourceId, resourceKind }
    );

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (secret && resourceId) {
      const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

      // choose endpoint by id prefix / type
      let endpoint = `https://api.paymongo.com/v1/sources/${resourceId}`;
      if (resourceId.startsWith("pay_"))
        endpoint = `https://api.paymongo.com/v1/payments/${resourceId}`;
      else if (resourceId.startsWith("pi_"))
        endpoint = `https://api.paymongo.com/v1/payment_intents/${resourceId}`;
      else if (
        resourceKind === "payment_intent" ||
        /payment_intent|payment_intents/i.test(eventType)
      )
        endpoint = `https://api.paymongo.com/v1/payment_intents/${resourceId}`;
      else if (
        resourceKind === "payment" ||
        /(^|\.)payment(\.|$)/i.test(eventType)
      )
        endpoint = `https://api.paymongo.com/v1/payments/${resourceId}`;

      let resource = null;
      try {
        const res = await fetch(endpoint, { headers: { Authorization: auth } });
        resource = await res.json().catch(() => null);
        console.debug("[paymongo webhook] fetched resource:", resource);
      } catch (err) {
        console.warn(
          "[paymongo webhook] failed to fetch resource for validation",
          err
        );
      }

      // upsert paymongo_resources
      try {
        const resId = resource?.data?.id ?? resourceId;
        const meta = resource?.data?.attributes?.metadata ?? {};
        const metaOrder = meta?.order_id ?? meta?.order ?? null;

        // avoid duplicating payment rows in paymongo_resources
        const isPaymentResource =
          resource?.data?.type === "payment" ||
          String(resId).startsWith("pay_");
        if (resId && !isPaymentResource) {
          await sb.from("paymongo_resources").upsert(
            {
              id: resId,
              order_id: metaOrder,
              type: resource?.data?.type ?? resourceKind ?? null,
              status: resource?.data?.attributes?.status ?? null,
              amount: resource?.data?.attributes?.amount ?? null,
              currency: resource?.data?.attributes?.currency ?? null,
              raw: resource,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          console.debug("[paymongo webhook] upserted paymongo_resources", {
            id: resId,
            order_id: metaOrder,
          });
        } else if (isPaymentResource) {
          console.debug(
            "[paymongo webhook] skipping paymongo_resources upsert for payment",
            resId
          );
        }

        // Auto-charge: if this is a chargeable source, create a Payment idempotently
        const isSource =
          resource?.data?.type === "source" || String(resId).startsWith("src_");
        const srcAttrs = resource?.data?.attributes ?? {};
        const isChargeable = isSource && srcAttrs?.status === "chargeable";

        if (isChargeable) {
          const sourceId = resId;
          // ensure no payment already exists for this source or order
          const { data: existingPayments } = await sb
            .from("paymongo_payments")
            .select("id")
            .or(`source_id.eq.${sourceId},order_id.eq.${metaOrder}`)
            .limit(1);

          if (!existingPayments || existingPayments.length === 0) {
            // create PayMongo Payment
            const payPayload = {
              data: {
                attributes: {
                  amount: srcAttrs.amount,
                  currency: srcAttrs.currency ?? "PHP",
                  source: { id: sourceId, type: "source" },
                  metadata: { order_id: metaOrder ?? null },
                },
              },
            };

            try {
              const payRes = await fetch(
                "https://api.paymongo.com/v1/payments",
                {
                  method: "POST",
                  headers: {
                    Authorization: auth,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payPayload),
                }
              );
              const payJson = await payRes.json().catch(() => null);
              const payId = payJson?.data?.id ?? null;
              const payAttrs = payJson?.data?.attributes ?? {};

              // upsert payment row
              await sb.from("paymongo_payments").upsert(
                {
                  id: payId ?? `pay_from_${sourceId}_${Date.now()}`,
                  source_id: sourceId,
                  order_id: payAttrs?.metadata?.order_id ?? metaOrder,
                  status: payAttrs?.status ?? null,
                  amount: payAttrs?.amount ?? srcAttrs.amount,
                  currency: payAttrs?.currency ?? srcAttrs.currency,
                  raw: payJson,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" }
              );
              console.info(
                "[paymongo webhook] created payment for source",
                sourceId,
                payId
              );
            } catch (err) {
              console.warn(
                "[paymongo webhook] failed creating payment for chargeable source",
                err
              );
            }
          } else {
            console.debug(
              "[paymongo webhook] payment already exists for source/order",
              sourceId,
              metaOrder
            );
          }
        }

        // If this is a payment resource, upsert into paymongo_payments and update orders
        // reuse isPaymentResource computed above
        if (isPaymentResource) {
          const pay = resource.data;
          const payAttrs = pay?.attributes ?? {};
          const payOrder = payAttrs?.metadata?.order_id ?? null;
          await sb.from("paymongo_payments").upsert(
            {
              id: pay.id,
              source_id: payAttrs?.source?.id ?? null,
              order_id: payOrder,
              status: payAttrs?.status ?? null,
              amount: payAttrs?.amount ?? null,
              currency: payAttrs?.currency ?? null,
              raw: resource,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          console.debug("[paymongo webhook] upserted paymongo_payments", {
            id: pay.id,
            order: payOrder,
          });

          // update orders table based on payment status
          if (payAttrs?.status === "paid" && payOrder) {
            await sb
              .from("orders")
              .update({ status: "paid" })
              .eq("order_id", payOrder);
          } else if (payAttrs?.status === "failed" && payOrder) {
            await sb
              .from("orders")
              .update({ status: "payment_failed" })
              .eq("order_id", payOrder);
          }
        }
      } catch (err) {
        console.warn("[paymongo webhook] DB upsert/create error", err);
      }
    } else {
      console.debug(
        "[paymongo webhook] no resource id resolved or PAYMONGO_SECRET_KEY missing",
        { resourceId, resourceKind }
      );
    }

    // map and log canonical event
    const rawEvent = body?.data?.attributes?.type ?? body?.type ?? "unknown";
    const eventMap: Record<string, string> = {
      "source.chargeable": "source.chargeable",
      "payment.paid": "payment.paid",
      "payment.failed": "payment.failed",
      "payment.refund.updated": "payment.refund.updated",
      "checkout_session.payment.paid": "checkout_session.payment.paid",
      "link.payment.paid": "link.payment.paid",
    };
    const eventName = eventMap[rawEvent] ?? rawEvent;
    console.info("[paymongo webhook] received event", eventName);

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("webhook parse error", e);
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 });
  }
}
