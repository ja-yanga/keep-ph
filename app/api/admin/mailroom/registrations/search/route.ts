import { NextResponse } from "next/server";
import { adminSearchMailroomRegistrations } from "@/app/actions/get";

/**
 * Search endpoint for mailroom registrations.
 * Uses a standardized server action and RPC for optimized server-side filtering.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const data = await adminSearchMailroomRegistrations({ q, limit });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error("admin.mailroom.registrations.search.GET:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
