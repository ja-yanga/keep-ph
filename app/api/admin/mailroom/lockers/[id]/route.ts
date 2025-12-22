import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabase = createSupabaseServiceClient();

type LockerRow = {
  location_locker_id: string;
  mailroom_location_id?: string | null;
  location_locker_code?: string | null;
  location_locker_is_available?: boolean | null;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    const code =
      has("locker_code") && body.locker_code != null
        ? String(body.locker_code)
        : undefined;
    const isAvailable =
      has("is_available") && body.is_available != null
        ? Boolean(body.is_available)
        : undefined;
    const locationId =
      has("location_id") && body.location_id != null
        ? String(body.location_id)
        : undefined;

    if (
      code === undefined &&
      isAvailable === undefined &&
      locationId === undefined
    ) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.location_locker_code = code;
    if (isAvailable !== undefined)
      updates.location_locker_is_available = isAvailable;
    if (locationId !== undefined) updates.mailroom_location_id = locationId;

    // fetch current locker to know original location (for total_lockers adjustments)
    const { data: currentLocker, error: currErr } = await supabase
      .from("location_locker_table")
      .select("mailroom_location_id")
      .eq("location_locker_id", id)
      .maybeSingle();
    if (currErr) {
      return NextResponse.json({ error: currErr.message }, { status: 500 });
    }
    const originalLocationId =
      (currentLocker as { mailroom_location_id?: string | null } | null)
        ?.mailroom_location_id ?? null;

    const { data, error } = await supabase
      .from("location_locker_table")
      .update(updates)
      .eq("location_locker_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 },
      );
    }

    const updated = (data as LockerRow) ?? null;

    // if location changed, adjust total_lockers counters
    try {
      if (locationId !== undefined && locationId !== originalLocationId) {
        if (originalLocationId) {
          const { data: oldLoc, error: oldErr } = await supabase
            .from("mailroom_location_table")
            .select("mailroom_location_total_lockers")
            .eq("mailroom_location_id", originalLocationId)
            .maybeSingle();
          if (!oldErr && oldLoc) {
            const cur =
              (oldLoc as { mailroom_location_total_lockers?: number })
                .mailroom_location_total_lockers ?? 0;
            const newTotal = Math.max(0, cur - 1);
            await supabase
              .from("mailroom_location_table")
              .update({ mailroom_location_total_lockers: newTotal })
              .eq("mailroom_location_id", originalLocationId);
          }
        }

        if (locationId) {
          const { data: newLoc, error: newErr } = await supabase
            .from("mailroom_location_table")
            .select("mailroom_location_total_lockers")
            .eq("mailroom_location_id", locationId)
            .maybeSingle();
          if (!newErr && newLoc) {
            const cur =
              (newLoc as { mailroom_location_total_lockers?: number })
                .mailroom_location_total_lockers ?? 0;
            await supabase
              .from("mailroom_location_table")
              .update({ mailroom_location_total_lockers: cur + 1 })
              .eq("mailroom_location_id", locationId);
          }
        }
      }
    } catch {
      // non-fatal; adjustments should not block response
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // fetch locker to know location id
    const { data: lockerData, error: lockerErr } = await supabase
      .from("location_locker_table")
      .select("mailroom_location_id")
      .eq("location_locker_id", id)
      .maybeSingle();

    if (lockerErr) {
      return NextResponse.json(
        { error: "Failed to fetch locker" },
        { status: 500 },
      );
    }

    const locId =
      (lockerData as { mailroom_location_id?: string | null } | null)
        ?.mailroom_location_id ?? null;

    // delete locker
    const { error: delErr } = await supabase
      .from("location_locker_table")
      .delete()
      .eq("location_locker_id", id);

    if (delErr) {
      return NextResponse.json(
        { error: (delErr as Error).message },
        { status: 500 },
      );
    }

    // decrement total_lockers if location present
    if (locId) {
      const { data: locData, error: locErr } = await supabase
        .from("mailroom_location_table")
        .select("mailroom_location_total_lockers")
        .eq("mailroom_location_id", locId)
        .maybeSingle();

      if (!locErr && locData) {
        const current =
          (locData as { mailroom_location_total_lockers?: number })
            .mailroom_location_total_lockers ?? 0;
        const newTotal = Math.max(0, current - 1);
        await supabase
          .from("mailroom_location_table")
          .update({ mailroom_location_total_lockers: newTotal })
          .eq("mailroom_location_id", locId);
      }
    }

    return NextResponse.json({ message: "Locker deleted" }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
