import { NextResponse } from "next/server";
import { adminListUsers } from "@/app/actions/get";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
  const from = (page - 1) * pageSize;

  const q = (searchParams.get("q") ?? "").trim();
  const sort = searchParams.get("sort") ?? "users_created_at";
  const direction = searchParams.get("direction") === "asc" ? "asc" : "desc";
  const role = (searchParams.get("role") ?? "").trim();

  try {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
