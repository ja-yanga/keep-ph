import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from(
      "mailroom_assigned_locker_table",
    ).select(`
        mailroom_assigned_locker_id,
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status,
        mailroom_assigned_locker_assigned_at,
        registration:mailroom_registration_table(
          mailroom_registration_id,
          user_id,
          users_table!inner(users_id, users_email)
        ),
        locker:location_locker_table(
          location_locker_id,
          location_locker_code,
          location_locker_is_available
        )
      `);

    if (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = rows.map((r) => {
      const rec = r as Record<string, unknown>;
      const registration = rec.registration as Record<string, unknown> | null;
      const users = registration?.users_table as Record<string, unknown> | null;
      const locker = rec.locker as Record<string, unknown> | null;

      return {
        id: rec.mailroom_assigned_locker_id,
        registration_id: rec.mailroom_registration_id,
        locker_id: rec.location_locker_id,
        status: rec.mailroom_assigned_locker_status,
        assigned_at: rec.mailroom_assigned_locker_assigned_at,
        registration: registration
          ? {
              id: registration.mailroom_registration_id,
              user_id: registration.user_id,
              email: users?.users_email ?? null,
            }
          : null,
        locker: locker
          ? {
              id: locker.location_locker_id,
              code: locker.location_locker_code,
              is_available: locker.location_locker_is_available ?? true,
            }
          : null,
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
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const registrationId = String(body.registration_id ?? "");
    const lockerId = String(body.locker_id ?? "");

    if (!registrationId || !lockerId) {
      return NextResponse.json(
        { error: "registration_id and locker_id are required" },
        { status: 400 },
      );
    }

    // check locker availability
    const { data: lockerRow, error: lockerErr } = await supabaseAdmin
      .from("location_locker_table")
      .select(
        "location_locker_id, location_locker_is_available, location_locker_code",
      )
      .eq("location_locker_id", lockerId)
      .single();

    if (lockerErr) {
      return NextResponse.json(
        { error: (lockerErr as Error).message },
        { status: 500 },
      );
    }

    if (!lockerRow || lockerRow.location_locker_is_available === false) {
      return NextResponse.json(
        { error: "Locker is not available" },
        { status: 409 },
      );
    }

    // create assignment
    const insertPayload = {
      mailroom_registration_id: registrationId,
      location_locker_id: lockerId,
      mailroom_assigned_locker_assigned_at: new Date().toISOString(),
      mailroom_assigned_locker_status: "Normal",
    };

    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from("mailroom_assigned_locker_table")
      .insert([insertPayload])
      .select(
        `
        mailroom_assigned_locker_id,
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status,
        mailroom_assigned_locker_assigned_at,
        locker:location_locker_table(location_locker_id, location_locker_code),
        registration:mailroom_registration_table(mailroom_registration_id, user_id)
      `,
      )
      .single();

    if (insertErr || !insertData) {
      return NextResponse.json(
        {
          error: (insertErr as Error).message || "Failed to create assignment",
        },
        { status: 500 },
      );
    }

    // mark locker unavailable
    const { error: updateErr } = await supabaseAdmin
      .from("location_locker_table")
      .update({ location_locker_is_available: false })
      .eq("location_locker_id", lockerId);

    if (updateErr) {
      // rollback assignment
      await supabaseAdmin
        .from("mailroom_assigned_locker_table")
        .delete()
        .eq(
          "mailroom_assigned_locker_id",
          insertData.mailroom_assigned_locker_id,
        );
      return NextResponse.json(
        { error: "Failed to reserve locker" },
        { status: 500 },
      );
    }

    const resp = {
      id: insertData.mailroom_assigned_locker_id,
      registration_id: insertData.mailroom_registration_id,
      locker_id: insertData.location_locker_id,
      status: insertData.mailroom_assigned_locker_status,
      assigned_at: insertData.mailroom_assigned_locker_assigned_at,
      locker: insertData.locker ?? null,
      registration: insertData.registration ?? null,
    };

    return NextResponse.json(resp, { status: 201 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
