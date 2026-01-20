import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminCreateMailroomLocation } from "@/app/actions/post";
import type { LocationRow } from "@/utils/types";

const normalizeLocation = (row: LocationRow) => ({
  id: row.mailroom_location_id,
  name: row.mailroom_location_name,
  code: row.mailroom_location_prefix ?? null,
  region: row.mailroom_location_region ?? null,
  city: row.mailroom_location_city ?? null,
  barangay: row.mailroom_location_barangay ?? null,
  zip: row.mailroom_location_zip ?? null,
  total_lockers: row.mailroom_location_total_lockers ?? 0,
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

    const offset = (page - 1) * pageSize;

    const supabase = await createClient();

    // Call the optimized RPC
    const { data, error } = await supabase.rpc(
      "rpc_list_mailroom_locations_paginated",
      {
        p_search: search,
        p_region: region,
        p_city: city,
        p_sort_by: sortBy || "name_asc",
        p_limit: pageSize,
        p_offset: offset,
      },
    );

    if (error) {
      throw error;
    }

    type RpcLocationResult = {
      id: string;
      name: string;
      code: string;
      region: string;
      city: string;
      barangay: string;
      zip: string;
      total_lockers: number;
      total_count: string | number;
    };

    const rows = (data as RpcLocationResult[]) || [];
    const count = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const normalized = rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      region: row.region,
      city: row.city,
      barangay: row.barangay,
      zip: row.zip,
      total_lockers: row.total_lockers,
    }));

    return NextResponse.json(
      {
        data: normalized,
        pagination: {
          page,
          pageSize,
          totalCount: count,
          totalPages: Math.ceil(count / pageSize),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
