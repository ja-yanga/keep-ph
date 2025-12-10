"use client";
import { useState } from "react";

export default function PaymongoTestPage() {
  const [amountPhp, setAmountPhp] = useState<string>("100.00");
  const [orderId, setOrderId] = useState<string>("TEST-ORDER-1");
  const [type, setType] = useState<string>("gcash"); // default to gcash
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsed = Number(amountPhp);
    if (!isFinite(parsed) || parsed <= 0) {
      setError("Invalid amount");
      return;
    }
    const minor = Math.round(parsed * 100);

    setLoading(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: minor,
          currency: "PHP",
          type,
          successUrl: `${
            location.origin
          }/payments/test/success?order=${encodeURIComponent(orderId)}`,
          failedUrl: `${
            location.origin
          }/payments/test/failed?order=${encodeURIComponent(orderId)}`,
        }),
      });

      const json = await res.json();
      setResult({ status: res.status, body: json });

      const redirectUrl =
        json?.data?.attributes?.redirect?.checkout_url ||
        json?.data?.attributes?.redirect?.url ||
        null;
      if (redirectUrl) {
        setResult((r: any) => ({ ...r, redirectUrl }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h2>PayMongo sandbox — test page</h2>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 12, marginTop: 12 }}
      >
        <label>
          Order ID
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Amount (PHP)
          <input
            value={amountPhp}
            onChange={(e) => setAmountPhp(e.target.value)}
            style={{ width: "100%" }}
            inputMode="decimal"
          />
        </label>

        <label>
          Payment type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: "100%" }}
          >
            {/* card removed temporarily */}
            <option value="gcash">gcash</option>
            {/* add other supported source types here if needed */}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create PayMongo Source"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>Error: {error}</div>
      )}

      {result && (
        <section
          style={{
            marginTop: 18,
            background: "#f7f7f7",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <div>
            <strong>HTTP status:</strong> {result.status}
          </div>

          {result.redirectUrl && (
            <div style={{ marginTop: 8 }}>
              <strong>Redirect URL:</strong>
              <div style={{ marginTop: 6 }}>
                <a href={result.redirectUrl} target="_blank" rel="noreferrer">
                  Open checkout
                </a>
              </div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <strong>Raw response:</strong>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result.body, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

function CardForm({
  clientKey,
  orderId,
}: {
  clientKey: string;
  orderId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("4242424242424242"); // default test card
  const [exp, setExp] = useState("12/28"); // default
  const [cvc, setCvc] = useState("123");

  const paymentIntentId = clientKey.split("_client_")[0];

  const onConfirm = async () => {
    setStatus("Creating payment method...");
    try {
      // parse expiration
      const [mmStr, yyStr] = exp.split("/").map((s) => s.trim());
      const exp_month = parseInt(mmStr, 10);
      const exp_year = parseInt(
        yyStr.length === 2 ? yyStr : yyStr.slice(-2),
        10
      );

      const pmId = await createPaymentMethodWithPubKey({
        card_number: cardNumber.replace(/\s+/g, ""),
        exp_month,
        exp_year,
        cvc,
      });
      console.debug("[card] created pm id:", pmId);

      setStatus("Confirming payment intent...");

      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, paymentMethodId: pmId }),
      });

      const json = await res.json();
      setStatus(
        `Server response: ${JSON.stringify(
          json
        )}\nFinal status via webhook (payment.paid / payment.failed).`
      );
    } catch (err: any) {
      setStatus("Error: " + (err?.message || String(err)));
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div>
        <strong>Payment Intent:</strong> <code>{paymentIntentId}</code>
      </div>

      <label>
        Card number
        <input
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242424242424242"
          style={{ width: "100%" }}
        />
      </label>

      <label>
        Exp (MM/YY)
        <input
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          placeholder="12/28"
          style={{ width: "100%" }}
        />
      </label>

      <label>
        CVC
        <input
          value={cvc}
          onChange={(e) => setCvc(e.target.value)}
          placeholder="123"
          style={{ width: "100%" }}
        />
      </label>

      <button style={{ marginTop: 12 }} onClick={onConfirm}>
        Confirm card payment
      </button>

      {status && (
        <div style={{ marginTop: 8 }}>
          <strong>Status:</strong> <pre>{status}</pre>
        </div>
      )}
    </div>
  );
}

// Helper for creating PaymentMethod using public key
async function createPaymentMethodWithPubKey(card: {
  card_number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}) {
  const pub = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
  if (!pub) throw new Error("Missing NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY");
  const auth = `Basic ${btoa(pub + ":")}`;

  const res = await fetch("https://api.paymongo.com/v1/payment_methods", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { attributes: { type: "card", details: card } },
    }),
  });

  const json = await res.json();
  if (!res.ok)
    throw new Error("Failed creating payment_method: " + JSON.stringify(json));
  return json.data.id; // pm_ ID
}
