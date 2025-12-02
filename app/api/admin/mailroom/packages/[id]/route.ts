import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();

    // 1. Update Package
    const { data, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update({
        tracking_number: body.tracking_number,
        registration_id: body.registration_id,
        locker_id: body.locker_id || null,
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

    // 2. Update Locker Status if provided (NEW LOGIC)
    if (body.locker_status && body.registration_id) {
      const { error: lockerError } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .update({ status: body.locker_status })
        .eq("registration_id", body.registration_id);

      if (lockerError)
        console.error("Failed to update locker status:", lockerError);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Update package error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const { error } = await supabaseAdmin
    .from("mailroom_packages")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
