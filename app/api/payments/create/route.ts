import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json();
  const { orderId, amount, currency = "PHP", type } = body;

  // Disable card payments for now
  if (type === "card") {
    return NextResponse.json(
      {
        error: "card payments temporarily disabled; use other payment methods",
      },
      { status: 410 }
    );
  }

  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 }
    );

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  // --- GCash / Maya / Others Flow ---
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
  return NextResponse.json(json, { status: res.ok ? 200 : 502 });
}
