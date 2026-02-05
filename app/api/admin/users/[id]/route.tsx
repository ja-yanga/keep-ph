import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateUserRole } from "@/app/actions/update";
import { getUserRole } from "@/app/actions/get";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

const ALLOWED_ADMIN_ROLES = ["admin", "owner"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(authUser.id);
    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const targetUserId = resolvedParams.id;
    const newRole = (body?.role ?? body?.users_role) as string | undefined;

    if (!targetUserId || !newRole) {
      void logApiError(request, {
        status: 400,
        message: "id and role are required.",
      });
      return NextResponse.json(
        { error: "id and role are required." },
        { status: 400 },
      );
    }

    const result = await adminUpdateUserRole({
      targetUserId,
      newRole,
      actorUserId: authUser.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update role" },
        { status: 403 },
      );
    }

    void logActivity({
      userId: authUser.id,
      action: "UPDATE",
      type: "ADMIN_ACTION",
      entityType: "USER",
      entityId: targetUserId,
      details: {
        role_update: newRole,
        actor_user_id: authUser.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    void logApiError(request, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
