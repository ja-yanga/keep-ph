import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserRole } from "@/app/actions/get";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const resolvedParams = (await params) as { id: string };
  const body = await request
    .json()
    .catch(() => ({}) as Record<string, unknown>);
  const role = (body?.role ?? body?.users_role) as string | undefined;
  const actorUserId = (body?.actor_user_id ?? body?.actorUserId) as
    | string
    | undefined;

  if (!resolvedParams?.id || !role || !actorUserId) {
    return NextResponse.json(
      { error: "id, role, and actor_user_id are required." },
      { status: 400 },
    );
  }

  const userId = resolvedParams.id;
  const targetRole = String(role).trim().toLowerCase();

  // validate UUID format (basic)
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(userId) || !uuidRe.test(actorUserId)) {
    return NextResponse.json(
      { error: "Invalid user id format." },
      { status: 400 },
    );
  }

  // validate role
  const validRoles = new Set(["owner", "admin", "approver", "user"]);
  if (!validRoles.has(targetRole)) {
    return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
  }

  const actorRoleRaw = await getUserRole(actorUserId);
  const actorRole = String(actorRoleRaw ?? "").toLowerCase();
  if (!actorRole) {
    return NextResponse.json(
      { error: "Actor role not found." },
      { status: 403 },
    );
  }

  // Only owner can assign owner
  if (targetRole === "owner" && actorRole !== "owner") {
    return NextResponse.json(
      { error: "Only owner can assign owner role." },
      { status: 403 },
    );
  }

  // Prevent admin from modifying an owner
  const currentTargetRoleRaw = await getUserRole(userId);
  const currentTargetRole = String(currentTargetRoleRaw ?? "").toLowerCase();
  if (currentTargetRole === "owner" && actorRole !== "owner") {
    return NextResponse.json(
      { error: "Only owner can update another owner." },
      { status: 403 },
    );
  }

  const allowedByRole: Record<string, string[]> = {
    owner: ["admin", "approver", "user", "owner"],
    admin: ["approver", "user"],
  };
  const allowedTargets = allowedByRole[actorRole] ?? [];
  if (!allowedTargets.includes(targetRole)) {
    return NextResponse.json(
      { error: "Forbidden: role not allowed to assign this role." },
      { status: 403 },
    );
  }

  // If owner transfers owner role, demote self to admin
  if (targetRole === "owner" && actorRole === "owner") {
    const { error: actorAuthError } = await supabase.auth.admin.updateUserById(
      actorUserId,
      { user_metadata: { role: "admin" } },
    );
    if (actorAuthError) {
      return NextResponse.json(
        { error: actorAuthError.message, details: actorAuthError },
        { status: 500 },
      );
    }

    const { error: actorTableError } = await supabase
      .from("users_table")
      .update({ users_role: "admin" })
      .eq("users_id", actorUserId);
    if (actorTableError) {
      return NextResponse.json(
        { error: actorTableError.message, details: actorTableError },
        { status: 500 },
      );
    }
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: { role: targetRole },
    },
  );

  if (authError) {
    return NextResponse.json(
      { error: authError.message, details: authError },
      { status: 500 },
    );
  }

  const { error: tableError } = await supabase
    .from("users_table")
    .update({ users_role: targetRole })
    .eq("users_id", userId);

  if (tableError) {
    return NextResponse.json(
      { error: tableError.message, details: tableError },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
