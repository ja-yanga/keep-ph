import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/app/actions/get";
import { adminUpdateUserKyc } from "@/app/actions/update";

export async function PUT(
  req: Request,
  context: { params: Promise<Record<string, string | undefined>> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify requester is admin
    const requesterRole = await getUserRole(user.id);
    const ALLOWED_ADMIN_ROLES = ["admin", "approver", "owner"];
    if (!requesterRole || !ALLOWED_ADMIN_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // params is a Promise in App Router handlers — await it first
    const resolvedParams = await context.params;
    // support both [id] and [user_id] route param names
    const userId = resolvedParams.user_id ?? resolvedParams.id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    // basic uuid validation to avoid DB cast errors
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").toUpperCase();

    let statusDb: string;
    if (action === "VERIFIED") {
      statusDb = "VERIFIED";
    } else if (action === "REJECTED") {
      statusDb = "REJECTED";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const data = await adminUpdateUserKyc({
      userId,
      status: statusDb as "VERIFIED" | "REJECTED",
    });

    return NextResponse.json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("admin KYC action error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
