import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (parseErr) {
      void parseErr;
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const resolvedParams = await params;
    let id = resolvedParams?.id ?? (body.id ? String(body.id) : undefined);

    if (!id) {
      try {
        const parsed = new URL(req.url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const idx = parts.lastIndexOf("locations");
        if (idx >= 0 && parts.length > idx + 1) {
          id = parts[idx + 1];
        } else {
          id = parts[parts.length - 1];
        }
      } catch (urlErr) {
        void urlErr;
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    const name = body.name !== undefined ? String(body.name) : undefined;

    // avoid nested ternaries — resolve each field explicitly
    let code: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "code")) {
      code = body.code ? String(body.code) : null;
    } else {
      code = undefined;
    }

    let region: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "region")) {
      region = body.region ? String(body.region) : null;
    } else {
      region = undefined;
    }

    let city: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "city")) {
      city = body.city ? String(body.city) : null;
    } else {
      city = undefined;
    }

    let barangay: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "barangay")) {
      barangay = body.barangay ? String(body.barangay) : null;
    } else {
      barangay = undefined;
    }

    let zip: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "zip")) {
      zip = body.zip ? String(body.zip) : null;
    } else {
      zip = undefined;
    }

    let totalLockers: number | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "total_lockers")) {
      const n = Number(body.total_lockers);
      totalLockers = Number.isNaN(n) ? 0 : n;
    } else {
      totalLockers = undefined;
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.mailroom_location_name = name;
    if (code !== undefined) updates.mailroom_location_prefix = code;
    if (region !== undefined) updates.mailroom_location_region = region;
    if (city !== undefined) updates.mailroom_location_city = city;
    if (barangay !== undefined) updates.mailroom_location_barangay = barangay;
    if (zip !== undefined) updates.mailroom_location_zip = zip;
    if (totalLockers !== undefined)
      updates.mailroom_location_total_lockers = totalLockers;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    // Fetch current location first to compare total_lockers and get current prefix
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("mailroom_location_table")
      .select("mailroom_location_total_lockers, mailroom_location_prefix")
      .eq("mailroom_location_id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const oldTotal =
      ((current as Record<string, unknown>).mailroom_location_total_lockers as
        | number
        | undefined) ?? 0;
    const newTotal =
      (updates.mailroom_location_total_lockers as number | undefined) ??
      oldTotal;

    const activePrefix =
      updates.mailroom_location_prefix !== undefined
        ? updates.mailroom_location_prefix
        : (current as Record<string, unknown>).mailroom_location_prefix;

    // Update the location
    const { data, error } = await supabaseAdmin
      .from("mailroom_location_table")
      .update(updates)
      .eq("mailroom_location_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 },
      );
    }

    // If total_lockers increased, generate new lockers
    if (newTotal > oldTotal) {
      const prefix = activePrefix ? `${String(activePrefix)}-` : "L";

      const lockersToCreate: Array<Record<string, unknown>> = [];
      for (let i = oldTotal + 1; i <= newTotal; i += 1) {
        lockersToCreate.push({
          mailroom_location_id: id,
          location_locker_code: `${prefix}${i.toString().padStart(3, "0")}`,
          location_locker_is_available: true,
        });
      }

      if (lockersToCreate.length > 0) {
        try {
          const { error: lockerError } = await supabaseAdmin
            .from("location_locker_table")
            .insert(lockersToCreate);
          void lockerError;
        } catch (lockerErr: unknown) {
          void lockerErr;
        }
      }
    }

    const normalized = data
      ? {
          id: data.mailroom_location_id,
          name: data.mailroom_location_name,
          code: data.mailroom_location_prefix ?? null,
          region: data.mailroom_location_region ?? null,
          city: data.mailroom_location_city ?? null,
          barangay: data.mailroom_location_barangay ?? null,
          zip: data.mailroom_location_zip ?? null,
          total_lockers: data.mailroom_location_total_lockers ?? 0,
        }
      : null;

    return NextResponse.json(
      { message: "Location updated", data: normalized },
      { status: 200 },
    );
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
