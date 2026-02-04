import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListLockers } from "@/app/actions/get";
import { adminCreateLocker } from "@/app/actions/post";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Math.min(100, Number(searchParams.get("pageSize") ?? 10)),
    );
    const search = searchParams.get("search")?.trim() || "";
    const locationId = searchParams.get("locationId")?.trim() || "";
    const activeTab = searchParams.get("activeTab") || "all";
    const sortBy = searchParams.get("sortBy") || "location_locker_code";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const offset = (page - 1) * pageSize;

    const { data, total_count } = await adminListLockers({
      search,
      locationId,
      activeTab,
      limit: pageSize,
      offset,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          pageSize,
          totalCount: total_count,
          totalPages: Math.ceil(total_count / pageSize),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!rawBody) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = String(rawBody.location_id ?? "").trim();
    const lockerCode = String(rawBody.locker_code ?? "").trim();
    const isAvailable =
      rawBody.is_available === null || rawBody.is_available === undefined
        ? true
        : Boolean(rawBody.is_available);

    const data = await adminCreateLocker({
      locationId,
      lockerCode,
      isAvailable,
    });

    return NextResponse.json(
      {
        data: {
          id: data.id,
          code: data.code,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
