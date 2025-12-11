"use client";
import React, { useState } from "react";

export default function PaymongoCheckoutButton({
  userId,
  amountPhp,
  label = "Pay now",
}: {
  userId: string;
  amountPhp: number; // e.g. 100.00
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setLoading(true);
    try {
      // create an order id tied to this registration (use userId or generate one)
      const orderId = `reg_${userId}_${Date.now()}`;

      const minor = Math.round(amountPhp * 100);

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: minor,
          currency: "PHP",
          show_all: true,
          // redirect back to your registration flow pages
          successUrl: `${
            location.origin
          }/mailroom/register/success?order=${encodeURIComponent(orderId)}`,
          failedUrl: `${
            location.origin
          }/mailroom/register/failed?order=${encodeURIComponent(orderId)}`,
        }),
      });

      const json = await res.json();
      const checkoutUrl =
        json?.data?.attributes?.checkout_url ||
        json?.data?.attributes?.redirect?.checkout_url ||
        json?.data?.attributes?.redirect?.url ||
        null;

      if (!checkoutUrl) {
        setError("No checkout URL returned from server");
        setLoading(false);
        return;
      }

      // redirect user to PayMongo hosted checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.message || "Payment creation failed");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        style={{ padding: "8px 12px" }}
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
