import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabase = createSupabaseServiceClient();

// CHANGED: Renamed from PUT to PATCH to match frontend request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const status = String(body.status ?? "").trim();

    const validStatuses = ["Empty", "Normal", "Near Full", "Full"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("mailroom_assigned_locker_table")
      .update({ mailroom_assigned_locker_status: status })
      .eq("mailroom_assigned_locker_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // fetch assignment to get locker id
    const { data: assignRow, error: fetchErr } = await supabase
      .from("mailroom_assigned_locker_table")
      .select("mailroom_assigned_locker_id, location_locker_id")
      .eq("mailroom_assigned_locker_id", id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const lockerId = assignRow?.location_locker_id as string | undefined;

    const { error: delErr } = await supabase
      .from("mailroom_assigned_locker_table")
      .delete()
      .eq("mailroom_assigned_locker_id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (lockerId) {
      await supabase
        .from("location_locker_table")
        .update({ location_locker_is_available: true })
        .eq("location_locker_id", lockerId);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
