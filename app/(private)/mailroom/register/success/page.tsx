"use client";
import { useEffect, useState } from "react";
import { Alert, Loader, Center } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function MailroomRegisterSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const order = params.get("order");
    if (!order) {
      router.push("/");
      return;
    }
    const orderStr = order;
    let mounted = true;

    async function check() {
      try {
        // check server-side registration finalization (preferred)
        const res = await fetch(
          `/api/mailroom/lookup-by-order?order=${encodeURIComponent(orderStr)}`,
        );
        const json = await res.json().catch(() => null);
        setDebug(json);
        const registration = json?.data ?? null;

        if (!mounted) return;

        if (registration && registration.paid) {
          setStatus("paid");
          setTimeout(() => router.push("/dashboard"), 1400);
          return;
        }

        // fallback: if registration not found, still check payment and retry
        setStatus("pending");
        setTimeout(check, 1500);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setStatus("pending");
        setTimeout(check, 1500);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <Center style={{ padding: 48 }}>
        <Loader />
      </Center>
    );
  }

  if (status === "paid") {
    return (
      <Alert
        icon={<IconCheck />}
        title="Registration complete"
        color="teal"
        radius="md"
      >
        Registration complete — redirecting to dashboard…
      </Alert>
    );
  }

  return (
    <>
      <Alert title="Awaiting registration" color="yellow">
        We&apos;re waiting for confirmation. This page will update
        automatically.
      </Alert>
      <div
        style={{
          marginTop: 12,
          maxHeight: 240,
          overflow: "auto",
          fontSize: 12,
        }}
      >
        <pre>{JSON.stringify(debug, null, 2)}</pre>
      </div>
    </>
  );
}
