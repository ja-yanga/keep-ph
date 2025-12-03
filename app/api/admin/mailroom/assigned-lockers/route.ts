import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from(
      "mailroom_assigned_lockers"
    ).select(`
        id,
        registration_id,
        locker_id,
        status, 
        assigned_at,
        locker:location_lockers (
          id,
          locker_code,
          is_available
        ),
        registration:mailroom_registrations (
          id,
          full_name,
          email
        )
      `);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registration_id, locker_id } = body;

    if (!registration_id || !locker_id) {
      return NextResponse.json(
        { error: "registration_id and locker_id are required" },
        { status: 400 }
      );
    }

    // Check locker availability
    const { data: lockerRow, error: lockerErr } = await supabaseAdmin
      .from("location_lockers")
      .select("id, is_available, locker_code")
      .eq("id", locker_id)
      .single();

    if (lockerErr) throw lockerErr;

    if (!lockerRow || lockerRow.is_available === false) {
      return NextResponse.json(
        { error: "Locker is not available" },
        { status: 409 }
      );
    }

    // Create assignment
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from("mailroom_assigned_lockers")
      .insert({
        registration_id,
        locker_id,
        assigned_at: new Date().toISOString(),
        status: "Normal",
      })
      .select(
        `
        id,
        registration_id,
        locker_id,
        status,
        assigned_at,
        locker:location_lockers ( id, locker_code ),
        registration:mailroom_registrations ( id, full_name, email )
      `
      )
      .single();

    if (insertErr) throw insertErr;

    // Mark locker unavailable
    const { error: updateLockerErr } = await supabaseAdmin
      .from("location_lockers")
      .update({ is_available: false })
      .eq("id", locker_id);

    if (updateLockerErr) {
      // rollback: try to remove the created assignment
      await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .delete()
        .eq("id", insertData.id);
      throw updateLockerErr;
    }

    return NextResponse.json(insertData, { status: 201 });
  } catch (error: any) {
    console.error("assign locker error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Error" },
      { status: 500 }
    );
  }
}
