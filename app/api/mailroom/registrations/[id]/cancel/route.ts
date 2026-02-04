import { NextResponse } from "next/server";
import { cancelMailroomSubscription } from "@/app/actions/update";
import { logApiError } from "@/lib/error-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await cancelMailroomSubscription(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("cancel route unexpected error:", err);
    void logApiError(req, { status: 500, message: msg, error: err });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
