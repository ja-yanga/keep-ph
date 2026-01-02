"use client";
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { useEffect, useState } from "react";

export default function PaymongoResultPage() {
  const [loading, setLoading] = useState(false);
  const [resJson, setResJson] = useState<{
    resource?: unknown;
    status?: number;
    ok?: boolean;
    type?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interpret status from either PayMongo API shape or DB-upserted row
  const interpretedStatus = (() => {
    const r = resJson?.resource as
      | {
          data?: { attributes?: { status?: string; payment_status?: string } };
          attributes?: { status?: string; payment_status?: string };
          raw?: {
            data?: {
              attributes?: { status?: string; payment_status?: string };
            };
          };
          status?: string;
        }
      | undefined;
    if (!r) return "unknown";
    // PayMongo API shape: r.data.attributes.status
    // DB upsert shape: r.status (and r.raw contains the API payload)
    const attrs =
      r.data?.attributes ?? r.attributes ?? r.raw?.data?.attributes ?? null;
    return attrs?.status ?? attrs?.payment_status ?? r.status ?? "unknown";
  })();

  useEffect(() => {
    const doFlow = async () => {
      const params = new URLSearchParams(window.location.search);
      const order = params.get("order");
      const id =
        params.get("source") ||
        params.get("id") ||
        params.get("payment_intent_id") ||
        null;
      const type =
        params.get("type") ||
        (params.get("payment_intent_id") ? "payment_intent" : "source");

      if (!order && !id) {
        setError("No order or PayMongo id found in query.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (id) {
          const j = await fetchFromAPI<{
            resource?: unknown;
            status?: number;
            ok?: boolean;
            type?: string;
          }>(`${API_ENDPOINTS.payments.verify}?id=${id}&type=${type}`);
          setResJson(j);
          return;
        }

        // no id: fallback to server-side lookup by order (uses your existing endpoint)
        const j = await fetchFromAPI<{
          resource?: unknown;
          type?: string;
        }>(
          `${API_ENDPOINTS.payments.lookupByOrder}?order=${encodeURIComponent(order!)}`,
        );

        if (j.resource || j.type) {
          // show found resource
          setResJson({
            status: 200,
            ok: true,
            resource: j.resource ?? j,
            type: j.type ?? "source",
          });
        } else {
          setError(
            "No PayMongo resource found for order. Try again later or check webhooks.",
          );
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Verify failed";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    doFlow();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h2>Payment result</h2>
      {loading && <div>Checking payment status…</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}
      {resJson && (
        <section
          style={{
            marginTop: 12,
            background: "#f7f7f7",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <div>
            <strong>HTTP:</strong> {String(resJson.status)}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Resource (raw):</strong>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(resJson.resource, null, 2)}
            </pre>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Interpreted status:</strong>
            <div>{interpretedStatus}</div>
          </div>
        </section>
      )}
      {!loading && !resJson && !error && <div>No payment info available.</div>}
    </main>
  );
}
