import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminCreateMailroomLocation } from "@/app/actions/post";
import { adminListMailroomLocationsPaginated } from "@/app/actions/get";
import { logApiError } from "@/lib/error-log";
import type { AdminMailroomLocation } from "@/utils/types";

const normalizeLocation = (row: AdminMailroomLocation) => ({
  id: row.mailroom_location_id,
  name: row.mailroom_location_name,
  code: row.mailroom_location_prefix ?? null,
  region: row.mailroom_location_region ?? null,
  city: row.mailroom_location_city ?? null,
  barangay: row.mailroom_location_barangay ?? null,
  zip: row.mailroom_location_zip ?? null,
  total_lockers: row.mailroom_location_total_lockers ?? 0,
  is_hidden: row.mailroom_location_is_hidden ?? false,
  max_locker_limit: row.mailroom_location_max_locker_limit ?? null,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Math.min(100, Number(searchParams.get("pageSize") ?? 10)),
    );
    const search = searchParams.get("search")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const sortBy = searchParams.get("sortBy")?.trim() || "";

    const result = await adminListMailroomLocationsPaginated({
      search,
      region,
      city,
      sortBy,
      page,
      pageSize,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control":
          "private, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("admin.mailroom.locations.GET:", err);
    return NextResponse.json({ error: message }, { status: 500 });
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

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      void logApiError(req, { status: 400, message: "Name is required" });
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const created = await adminCreateMailroomLocation({
      userId: user.id,
      name,
      code: body.code ? String(body.code) : null,
      region: body.region ? String(body.region) : null,
      city: body.city ? String(body.city) : null,
      barangay: body.barangay ? String(body.barangay) : null,
      zip: body.zip ? String(body.zip) : null,
      total_lockers: Number(body.total_lockers ?? 0) || 0,
    });

    return NextResponse.json(
      {
        message: "Location created",
        data: normalizeLocation(created),
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("admin.mailroom.locations.POST:", err);
    void logApiError(req, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
