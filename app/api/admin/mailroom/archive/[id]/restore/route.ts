import { NextRequest, NextResponse } from "next/server";
import { adminRestoreMailboxItem } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id = "";
  try {
    const solvedParams = await params;
    id = solvedParams.id;
    console.log("[Restore] ID from params:", id);
    if (!id) {
      void logApiError(request, { status: 400, message: "ID is required" });
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await adminRestoreMailboxItem(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error(
      `Error in POST /api/admin/mailroom/archive/${id}/restore:`,
      error,
    );
    void logApiError(request, { status: 500, message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
