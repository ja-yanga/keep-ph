import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabase = createSupabaseServiceClient();

type LockerRow = {
  location_locker_id: string;
  mailroom_location_id?: string | null;
  location_locker_code?: string | null;
  location_locker_is_available?: boolean | null;
  location_locker_created_at?: string | null;
  mailroom_location_table?: {
    mailroom_location_id?: string;
    mailroom_location_name?: string;
  } | null;
};

export async function GET() {
  try {
    // fetch lockers with location info
    const { data: lockersData, error: lockersErr } = await supabase
      .from("location_locker_table")
      .select(
        "location_locker_id, mailroom_location_id, location_locker_code, location_locker_is_available, location_locker_created_at, mailroom_location_table(mailroom_location_id, mailroom_location_name)",
      )
      .order("location_locker_created_at", { ascending: false });

    if (lockersErr) {
      return NextResponse.json(
        { error: (lockersErr as Error).message },
        { status: 500 },
      );
    }

    const lockerRows = Array.isArray(lockersData)
      ? (lockersData as LockerRow[])
      : [];

    // fetch current assignments separately and build map by locker id
    const { data: assignedData } = await supabase
      .from("mailroom_assigned_locker_table")
      .select(
        "mailroom_assigned_locker_id, location_locker_id, mailroom_registration_id, mailroom_assigned_locker_status",
      );

    const assignedRows = Array.isArray(assignedData)
      ? (assignedData as Record<string, unknown>[])
      : [];
    const assignedMap = new Map<string, Record<string, unknown>>();
    for (const a of assignedRows) {
      const lid = String(a.location_locker_id ?? "");
      if (lid) {
        // keep the latest if multiple (shouldn't happen due to UNIQUE constraint)
        assignedMap.set(lid, a);
      }
    }

    const normalized = lockerRows.map((r) => {
      const locTable = r.mailroom_location_table;
      const assigned = assignedMap.get(r.location_locker_id ?? "") ?? null;
      const isAvailable = r.location_locker_is_available ?? true;
      // consider assigned existence first; fallback to is_available flag
      const isAssigned = Boolean(assigned) || isAvailable === false;

      return {
        id: r.location_locker_id,
        location_id: r.mailroom_location_id ?? null,
        code: r.location_locker_code ?? null,
        is_available: isAvailable,
        created_at: r.location_locker_created_at ?? null,
        location: locTable
          ? {
              id: locTable.mailroom_location_id ?? null,
              name: locTable.mailroom_location_name ?? null,
            }
          : null,
        assigned: assigned
          ? {
              id: assigned.mailroom_assigned_locker_id ?? null,
              registration_id: assigned.mailroom_registration_id ?? null,
              status: assigned.mailroom_assigned_locker_status ?? null,
            }
          : null,
        is_assigned: isAssigned,
      };
    });

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = String(body.location_id ?? "").trim();
    const lockerCode = String(body.locker_code ?? "").trim();
    const isAvailable =
      body.is_available == null ? true : Boolean(body.is_available);

    if (!locationId || !lockerCode) {
      return NextResponse.json(
        { error: "location_id and locker_code are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("location_locker_table")
      .insert([
        {
          mailroom_location_id: locationId,
          location_locker_code: lockerCode,
          location_locker_is_available: isAvailable,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: (error as Error)?.message || "Failed to create locker" },
        { status: 500 },
      );
    }

    // increment total_lockers on location (best-effort)
    const { data: locData, error: locErr } = await supabase
      .from("mailroom_location_table")
      .select("mailroom_location_total_lockers")
      .eq("mailroom_location_id", locationId)
      .maybeSingle();

    if (!locErr && locData) {
      const cur =
        (locData as { mailroom_location_total_lockers?: number })
          .mailroom_location_total_lockers ?? 0;
      await supabase
        .from("mailroom_location_table")
        .update({ mailroom_location_total_lockers: cur + 1 })
        .eq("mailroom_location_id", locationId);
    }

    const created = data as {
      location_locker_id: string;
      location_locker_code?: string | null;
    };

    return NextResponse.json(
      {
        data: {
          id: created.location_locker_id,
          code: created.location_locker_code ?? null,
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
