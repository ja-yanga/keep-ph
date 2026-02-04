import { NextRequest, NextResponse } from "next/server";
import { adminPermanentDeleteMailboxItem } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id = "";
  try {
    const solvedParams = await params;
    id = solvedParams.id;
    console.log("[PermanentDelete] ID from params:", id);
    if (!id) {
      void logApiError(request, { status: 400, message: "ID is required" });
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await adminPermanentDeleteMailboxItem(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error(
      `Error in DELETE /api/admin/mailroom/archive/${id}/permanent:`,
      error,
    );
    void logApiError(request, { status: 500, message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
