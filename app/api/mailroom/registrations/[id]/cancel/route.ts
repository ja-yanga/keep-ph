import { NextResponse } from "next/server";
import { cancelMailroomSubscription } from "@/app/actions/update";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await cancelMailroomSubscription(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("cancel route unexpected error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
