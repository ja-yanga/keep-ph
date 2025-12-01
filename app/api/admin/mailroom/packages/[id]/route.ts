import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const body = await request.json();

  // 1. Update Package
  const { data, error } = await supabase
    .from("mailroom_packages")
    .update({
      tracking_number: body.tracking_number,
      registration_id: body.registration_id,
      package_type: body.package_type,
      status: body.status,
      notes: body.notes,
      mailroom_full: body.mailroom_full,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Update Locker Status (if locker is assigned and status is provided)
  if (body.locker_id && body.locker_status) {
    const { error: lockerError } = await supabase
      .from("mailroom_assigned_lockers")
      .update({ status: body.locker_status })
      .eq("locker_id", body.locker_id)
      .eq("registration_id", body.registration_id);

    if (lockerError) {
      console.error("Failed to update locker status:", lockerError);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  const { error } = await supabase
    .from("mailroom_packages")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
