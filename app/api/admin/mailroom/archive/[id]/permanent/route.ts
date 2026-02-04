import { NextRequest, NextResponse } from "next/server";
import { adminPermanentDeleteMailboxItem } from "@/app/actions/post";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

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

    // Logging
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await logActivity({
          userId: user.id,
          action: "DELETE",
          type: "ADMIN_ACTION",
          entityType: "MAILBOX_ITEM",
          entityId: id,
          details: {
            action: "PERMANENT_DELETE_MAILBOX_ITEM",
            package_name: result?.package_name,
            status: "DELETED",
          },
        });
      }
    } catch (logErr) {
      console.error("[PermanentDelete] Logging failed:", logErr);
    }

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
