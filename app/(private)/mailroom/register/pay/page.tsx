"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Box,
  Paper,
  Stack,
  TextInput,
  Button,
  Title,
  Text,
  Alert,
  Group,
} from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

function createPaymentMethod(card: {
  card_number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}): Promise<string> {
  const pub = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
  if (!pub)
    return Promise.reject(new Error("Missing NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY"));
  const auth = `Basic ${btoa(pub + ":")}`;
  return fetch("https://api.paymongo.com/v1/payment_methods", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { attributes: { type: "card", details: card } },
    }),
  })
    .then((res) => res.json())
    .then((json) => {
      if (!json?.data?.id)
        throw new Error(
          json?.errors?.[0]?.detail ?? "Failed to create payment method",
        );
      return json.data.id as string;
    });
}

function PayPageContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent_id");
  const orderId = searchParams.get("order_id");
  const successUrl = searchParams.get("success_url");
  const failedUrl = searchParams.get("failed_url");

  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !paymentIntentId || !orderId || !successUrl || !failedUrl;

  useEffect(() => {
    if (missing)
      setError(
        "Missing required parameters. Please start from the registration page.",
      );
  }, [missing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const expM = parseInt(expMonth, 10);
      const expY = parseInt(expYear, 10);
      if (!cardNumber.trim() || !expMonth || !expYear || !cvc.trim()) {
        setError("Please fill in all card fields.");
        return;
      }
      if (expM < 1 || expM > 12) {
        setError("Invalid expiry month.");
        return;
      }

      const paymentMethodId = await createPaymentMethod({
        card_number: cardNumber.replace(/\s/g, ""),
        exp_month: expM,
        exp_year: expY,
        cvc: cvc.trim(),
      });

      const attachRes = await fetch(API_ENDPOINTS.payments.attach, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          payment_method_id: paymentMethodId,
          return_url: successUrl,
        }),
      });

      const attachJson = await attachRes.json().catch(() => ({}));

      if (!attachRes.ok) {
        setError(
          attachJson?.error ??
            attachJson?.errors?.[0]?.detail ??
            "Payment could not be completed.",
        );
        return;
      }

      const nextActionUrl = attachJson?.next_action_url ?? null;
      if (nextActionUrl) {
        window.location.href = nextActionUrl;
        return;
      }
      if (attachJson?.status === "succeeded") {
        window.location.href = successUrl ?? "/mailroom/register/success";
        return;
      }
      window.location.href = successUrl ?? "/mailroom/register/success";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (missing) {
    return (
      <Box p="xl">
        <Alert color="red" title="Invalid link">
          {error ??
            "Missing payment_intent_id, order_id, or redirect URLs. Please complete registration again."}
        </Alert>
        <Button component="a" href="/mailroom/register" mt="md">
          Back to registration
        </Button>
      </Box>
    );
  }

  return (
    <Box p="xl" maw={480} mx="auto">
      <Title order={3} mb="xs">
        Complete subscription payment
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Enter your card details to start your mailroom subscription. Your card
        will be charged automatically each billing cycle.
      </Text>

      {error && (
        <Alert
          color="red"
          mb="md"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Card number"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
            />
            <Group grow>
              <TextInput
                label="Expiry month"
                placeholder="12"
                value={expMonth}
                onChange={(e) =>
                  setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                maxLength={2}
              />
              <TextInput
                label="Expiry year"
                placeholder="25"
                value={expYear}
                onChange={(e) =>
                  setExpYear(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                maxLength={2}
              />
              <TextInput
                label="CVC"
                placeholder="123"
                value={cvc}
                onChange={(e) =>
                  setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
              />
            </Group>
            <Button type="submit" loading={loading} fullWidth>
              {loading ? "Processing…" : "Pay and subscribe"}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Text size="xs" c="dimmed" mt="md">
        Test card: 4120000000000007 (successful subscription activation)
      </Text>
    </Box>
  );
}

export default function MailroomRegisterPayPage() {
  return (
    <Suspense fallback={<Box p="xl">Loading…</Box>}>
      <PayPageContent />
    </Suspense>
  );
}
