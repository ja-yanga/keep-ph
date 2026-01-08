import { NextResponse } from "next/server";
import { adminGetMailroomRegistrationsConsolidated } from "@/app/actions/get";

/**
 * Handle GET requests to list mailroom registrations and related data.
 * Consolidates multiple table fetches into a single RPC call.
 */
export async function GET() {
  try {
    const data = await adminGetMailroomRegistrationsConsolidated();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "private, max-age=0, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: unknown) {
    console.error("admin.mailroom.registrations.GET:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
