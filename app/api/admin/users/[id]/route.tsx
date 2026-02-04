import { NextResponse } from "next/server";
import { adminUpdateUserRole } from "@/app/actions/update";
import { logApiError } from "@/lib/error-log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const targetUserId = resolvedParams.id;
    const role = (body?.role ?? body?.users_role) as string | undefined;
    const actorUserId = (body?.actor_user_id ?? body?.actorUserId) as
      | string
      | undefined;

    if (!targetUserId || !role || !actorUserId) {
      void logApiError(request, {
        status: 400,
        message: "id, role, and actor_user_id are required.",
      });
      return NextResponse.json(
        { error: "id, role, and actor_user_id are required." },
        { status: 400 },
      );
    }

    const result = await adminUpdateUserRole({
      targetUserId,
      newRole: role,
      actorUserId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update role" },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    void logApiError(request, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
