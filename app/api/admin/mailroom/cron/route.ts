import { NextResponse } from "next/server";
import { adminProcessExpiredSubscriptions } from "@/app/actions/post";

/**
 * API route for triggering the mailroom cron job.
 * POST /api/admin/mailroom/cron
 */
export async function POST() {
  try {
    const data = await adminProcessExpiredSubscriptions();

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[Cron Route Error]:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Cron processing failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
