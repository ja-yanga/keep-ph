import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const rawType = (url.searchParams.get("type") || "source").toLowerCase(); // "source" | "payment" | "payment_intent"
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret)
      return NextResponse.json(
        { error: "missing PAYMONGO_SECRET_KEY" },
        { status: 500 }
      );

    const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

    // map requested type to the correct PayMongo endpoint
    let endpoint = `https://api.paymongo.com/v1/sources/${encodeURIComponent(
      id
    )}`;
    if (
      rawType === "payment_intent" ||
      rawType === "paymentintent" ||
      rawType === "pi"
    ) {
      endpoint = `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(
        id
      )}`;
    } else if (rawType === "payment" || rawType === "pay") {
      endpoint = `https://api.paymongo.com/v1/payments/${encodeURIComponent(
        id
      )}`;
    }

    const res = await fetch(endpoint, { headers: { Authorization: auth } });
    const json = await res.json().catch(() => null);
    // forward PayMongo's HTTP status so caller can see 404/401/200 etc.
    return NextResponse.json(
      { status: res.status, ok: res.ok, resource: json },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("verify-paymongo:", err);
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
