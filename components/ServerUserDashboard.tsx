// Note: server component
import React from "react";
import { cookies } from "next/headers";
import UserDashboard from "./UserDashboard";

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
    const json = await res.json().catch(() => ({}));
    const rows = Array.isArray(json?.data ?? json) ? json.data ?? json : [];
    return <UserDashboard initialData={rows} />;
  } catch (err) {
    // fallback to empty data so client still renders
    return <UserDashboard initialData={[]} />;
  }
}
