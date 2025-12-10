"use client";
import { useEffect } from "react";

export default function PaymongoFailedForward() {
  useEffect(() => {
    // run only on client
    const qs = typeof window !== "undefined" ? window.location.search : "";
    if (typeof window !== "undefined") {
      window.location.replace(`/payments/test/result${qs}`);
    }
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h2>Processing payment result…</h2>
      <p>
        If you are not redirected automatically,{" "}
        <a id="manual-link" href="/payments/test/result">
          click here
        </a>
        .
      </p>
    </main>
  );
}
