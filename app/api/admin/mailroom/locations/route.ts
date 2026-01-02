import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllMailRoomLocation } from "@/app/actions/get";
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

export async function GET() {
  try {
    const locations = await getAllMailRoomLocation();
    const normalized = locations.map(normalizeLocation);
    return NextResponse.json({ data: normalized }, { status: 200 });
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
