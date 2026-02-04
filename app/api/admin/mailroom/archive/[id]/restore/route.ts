import { NextRequest, NextResponse } from "next/server";
import { adminRestoreMailboxItem } from "@/app/actions/post";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

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
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await adminRestoreMailboxItem(id);

    // Logging
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await logActivity({
          userId: user.id,
          action: "RESTORE",
          type: "ADMIN_ACTION",
          entityType: "MAILBOX_ITEM",
          entityId: id,
          details: {
            action: "RESTORE_MAILBOX_ITEM",
            package_name: result?.package_name,
            registration_id: result?.registration_id,
            status: "RESTORED",
          },
        });
      }
    } catch (logErr) {
      console.error("[Restore] Logging failed:", logErr);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error(
      `Error in POST /api/admin/mailroom/archive/${id}/restore:`,
      error,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
