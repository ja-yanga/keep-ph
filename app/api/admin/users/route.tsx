import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListUsers, getUserRole } from "@/app/actions/get";
import { logApiError } from "@/lib/error-log";

const ALLOWED_ADMIN_ROLES = ["admin", "owner"] as const;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterRole = await getUserRole(user.id);
    if (!requesterRole || !ALLOWED_ADMIN_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
    const from = (page - 1) * pageSize;

    const q = (searchParams.get("q") ?? "").trim();
    const sort = searchParams.get("sort") ?? "users_created_at";
    const direction = searchParams.get("direction") === "asc" ? "asc" : "desc";
    const role = (searchParams.get("role") ?? "").trim();

    const { data, total_count } = await adminListUsers({
      search: q,
      limit: pageSize,
      offset: from,
      sort,
      direction,
      role,
    });

    return NextResponse.json({ data, count: total_count }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch users";
    void logApiError(request, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
