import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (parseErr: unknown) {
      void parseErr;
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationIdRaw = body.location_id;
    const totalRaw = body.total;

    if (!locationIdRaw) {
      return NextResponse.json(
        { error: "Missing location_id" },
        { status: 400 },
      );
    }

    const locationId = String(locationIdRaw);

    const totalNum = Number(totalRaw ?? 0);
    if (!Number.isInteger(totalNum) || totalNum <= 0) {
      return NextResponse.json(
        { error: "Invalid total; must be a positive integer" },
        { status: 400 },
      );
    }

    // Fetch location to get prefix and current total_lockers
    const { data: locData, error: locErr } = await supabaseAdmin
      .from("mailroom_location_table")
      .select("mailroom_location_prefix, mailroom_location_total_lockers")
      .eq("mailroom_location_id", locationId)
      .single();

    if (locErr || !locData) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const prefix = (locData as Record<string, unknown>)
      .mailroom_location_prefix as string | null | undefined;
    const currentTotal =
      ((locData as Record<string, unknown>).mailroom_location_total_lockers as
        | number
        | null
        | undefined) ?? 0;

    const startIndex = currentTotal + 1;
    const endIndex = currentTotal + totalNum;

    const lockersToInsert: Array<Record<string, unknown>> = [];
    const cleanPrefix = prefix ? String(prefix).trim() : null;
    const codePrefix = cleanPrefix ? `${cleanPrefix}-` : "L-";

    for (let i = startIndex; i <= endIndex; i += 1) {
      lockersToInsert.push({
        mailroom_location_id: locationId,
        location_locker_code: `${codePrefix}${i}`,
        location_locker_is_available: true,
      });
    }

    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from("location_locker_table")
      .insert(lockersToInsert)
      .select();

    if (insertErr) {
      return NextResponse.json(
        { error: "Failed to create lockers" },
        { status: 500 },
      );
    }

    // update location total_lockers
    const newTotal = endIndex;
    const { error: updErr } = await supabaseAdmin
      .from("mailroom_location_table")
      .update({ mailroom_location_total_lockers: newTotal })
      .eq("mailroom_location_id", locationId);

    if (updErr) {
      return NextResponse.json(
        { error: "Created lockers but failed to update location total" },
        { status: 500 },
      );
    }

    const created = Array.isArray(insertData) ? insertData : [];

    return NextResponse.json(
      {
        message: "Lockers generated",
        data: {
          location_id: locationId,
          created_count: created.length,
          created_lockers: created.map((r) => ({
            id: (r as Record<string, unknown>).location_locker_id,
            code: (r as Record<string, unknown>).location_locker_code,
          })),
          total_lockers: newTotal,
        },
      },
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
