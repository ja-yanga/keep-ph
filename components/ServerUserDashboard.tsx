// Note: server component
import React from "react";
import { cookies } from "next/headers";
import UserDashboard from "./UserDashboard";
import type { RawRow } from "@/utils/types/types";

export default async function ServerUserDashboard() {
  // build cookie header to forward auth
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  try {
    const res = await fetch(`${base}/api/mailroom/registrations`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}) as Record<string, unknown>);
    const payload = (json as Record<string, unknown>)?.data ?? json;
    const rows = Array.isArray(payload)
      ? (payload as unknown as RawRow[])
      : ([] as RawRow[]);
    return <UserDashboard initialData={rows} />;
  } catch {
    return <UserDashboard initialData={[]} />;
  }
}
