import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListUserKyc, getUserRole } from "@/app/actions/get";

export async function GET(req: Request) {
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

    // support ?q=search, ?page=1, ?pageSize=10
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? "10"),
    );
    const offset = (page - 1) * pageSize;
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortOrder = url.searchParams.get("sortOrder") ?? "DESC";

    const { data: raw, total_count } = await adminListUserKyc(
      q,
      pageSize,
      offset,
      status ?? undefined,
      sortBy,
      sortOrder,
    );

    return NextResponse.json(
      { data: raw, total_count },
      {
        headers: {
          "Cache-Control":
            "private, max-age=30, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("admin KYC list error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
