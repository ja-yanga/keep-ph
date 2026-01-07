import React from "react";
import { cookies } from "next/headers";
import { SessionProvider } from "./SessionProvider";
// Note: this is a server component

export default async function ServerSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // fetch server-side and forward cookies so /api/session can read auth cookie
  // `cookies()` may be async in this environment — await it and build a cookie header
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  let sessionData: unknown = null;
  try {
    const res = await fetch(`${base}/api/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    sessionData = (await res.json().catch(() => null)) ?? null;
  } catch {
    // fallback to null on error
    sessionData = null;
  }

  // pass the fetched session to the client provider to hydrate initial state
  return (
    <SessionProvider initialSession={sessionData ?? null}>
      {children}
    </SessionProvider>
  );
}
