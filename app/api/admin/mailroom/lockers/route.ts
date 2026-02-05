import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListLockers } from "@/app/actions/get";
import { adminCreateLocker } from "@/app/actions/post";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/error-log";

const serviceSupabase = createSupabaseServiceClient();

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

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      void logApiError(req, { status: 400, message: "Invalid JSON body" });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = String(body.location_id ?? "").trim();
    const lockerCode = String(body.locker_code ?? "").trim();
    const isAvailable =
      body.is_available === null || body.is_available === undefined
        ? true
        : Boolean(body.is_available);

    if (!locationId || !lockerCode) {
      return NextResponse.json(
        { error: "location_id and locker_code are required" },
        { status: 400 },
      );
    }

    // Use the action to create the locker
    const data = await adminCreateLocker({
      locationId,
      lockerCode,
      isAvailable,
    });

    // increment total_lockers on location (best-effort)
    // We use service client to bypass RLS for this internal account update
    const { data: locData, error: locErr } = await serviceSupabase
      .from("mailroom_location_table")
      .select("mailroom_location_total_lockers")
      .eq("mailroom_location_id", locationId)
      .maybeSingle();

    if (!locErr && locData) {
      const cur =
        (locData as { mailroom_location_total_lockers?: number })
          .mailroom_location_total_lockers ?? 0;
      await serviceSupabase
        .from("mailroom_location_table")
        .update({ mailroom_location_total_lockers: cur + 1 })
        .eq("mailroom_location_id", locationId);
    }

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
    void logApiError(req, {
      status: 500,
      message: "Internal Server Error",
      error: err,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
