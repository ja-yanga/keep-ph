import { NextRequest, NextResponse } from "next/server";
import { adminPermanentDeleteMailboxItem } from "@/app/actions/post";

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
