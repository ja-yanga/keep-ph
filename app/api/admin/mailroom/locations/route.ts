import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type LocationRow = {
  mailroom_location_id: string;
  mailroom_location_name: string;
  mailroom_location_region?: string | null;
  mailroom_location_city?: string | null;
  mailroom_location_barangay?: string | null;
  mailroom_location_zip?: string | null;
  mailroom_location_total_lockers?: number | null;
  mailroom_location_prefix?: string | null;
};

// GET all locations
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("mailroom_location_table")
      .select("*")
      .order("mailroom_location_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? (data as LocationRow[]) : [];
    const normalized = rows.map((r) => ({
      id: r.mailroom_location_id,
      name: r.mailroom_location_name,
      code: r.mailroom_location_prefix ?? null,
      region: r.mailroom_location_region ?? null,
      city: r.mailroom_location_city ?? null,
      barangay: r.mailroom_location_barangay ?? null,
      zip: r.mailroom_location_zip ?? null,
      total_lockers: r.mailroom_location_total_lockers ?? 0,
    }));

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST create new location
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (parseErr) {
      void parseErr;
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    const code = body.code ? String(body.code) : null;
    const region = body.region ? String(body.region) : null;
    const city = body.city ? String(body.city) : null;
    const barangay = body.barangay ? String(body.barangay) : null;
    const zip = body.zip ? String(body.zip) : null;
    const totalLockers = Number(body.total_lockers ?? 0) || 0;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const insertPayload = {
      mailroom_location_name: name,
      mailroom_location_prefix: code,
      mailroom_location_region: region,
      mailroom_location_city: city,
      mailroom_location_barangay: barangay,
      mailroom_location_zip: zip,
      mailroom_location_total_lockers: totalLockers,
    };

    const { data, error } = await supabaseAdmin
      .from("mailroom_location_table")
      .insert([insertPayload])
      .select();

    if (error || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: (error as Error).message || "Failed to create location" },
        { status: 500 },
      );
    }

    const created = data[0] as LocationRow;
    const locationId = created.mailroom_location_id;
    const prefix = created.mailroom_location_prefix ?? "L";

    if (totalLockers > 0) {
      const lockers: Array<Record<string, unknown>> = [];

      const cleanPrefix = prefix ? String(prefix).trim() : null;
      const codePrefix = cleanPrefix ? `${cleanPrefix}-` : "L-";

      for (let i = 1; i <= totalLockers; i += 1) {
        lockers.push({
          mailroom_location_id: locationId,
          location_locker_code: `${codePrefix}${i}`,
          location_locker_is_available: true,
        });
      }

      try {
        const { error: lockerError } = await supabaseAdmin
          .from("location_locker_table")
          .insert(lockers);
        void lockerError;
      } catch (lockerInsertErr: unknown) {
        void lockerInsertErr;
      }
    }

    const normalized = {
      id: created.mailroom_location_id,
      name: created.mailroom_location_name,
      code: created.mailroom_location_prefix ?? null,
      region: created.mailroom_location_region ?? null,
      city: created.mailroom_location_city ?? null,
      barangay: created.mailroom_location_barangay ?? null,
      zip: created.mailroom_location_zip ?? null,
      total_lockers: created.mailroom_location_total_lockers ?? 0,
    };

    return NextResponse.json(
      { message: "Location created with lockers", data: normalized },
      { status: 201 },
    );
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
