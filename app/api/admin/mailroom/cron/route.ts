import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // 1. Fetch all active registrations
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from("mailroom_registrations")
      .select("id, created_at, months, mailroom_status")
      .eq("mailroom_status", true);

    if (fetchError) throw fetchError;

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        message: "No active subscriptions to check.",
      });
    }

    const expiredRegistrationIds: string[] = [];

    // 2. Filter for expired ones
    registrations.forEach((reg) => {
      const expiresAt = dayjs(reg.created_at).add(reg.months, "month");
      // If current date is AFTER expiration date
      if (dayjs().isAfter(expiresAt)) {
        expiredRegistrationIds.push(reg.id);
      }
    });

    if (expiredRegistrationIds.length === 0) {
      return NextResponse.json({ message: "No expired subscriptions found." });
    }

    // 3. Find assigned lockers for these expired users
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("mailroom_assigned_lockers")
      .select("locker_id")
      .in("registration_id", expiredRegistrationIds);

    if (assignError) throw assignError;

    const lockerIdsToFree = assignments
      ? assignments.map((a) => a.locker_id)
      : [];

    // --- DATABASE UPDATES ---

    // A. Mark registrations as inactive
    const { error: updateRegError } = await supabaseAdmin
      .from("mailroom_registrations")
      .update({ mailroom_status: false })
      .in("id", expiredRegistrationIds);

    if (updateRegError) throw updateRegError;

    // B. Delete the assignments (Remove the link between user and locker)
    if (expiredRegistrationIds.length > 0) {
      const { error: deleteAssignError } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .delete()
        .in("registration_id", expiredRegistrationIds);

      if (deleteAssignError) throw deleteAssignError;
    }

    // C. Mark the actual lockers as available again
    if (lockerIdsToFree.length > 0) {
      const { error: updateLockerError } = await supabaseAdmin
        .from("location_lockers")
        .update({ is_available: true })
        .in("id", lockerIdsToFree);

      if (updateLockerError) throw updateLockerError;
    }

    return NextResponse.json({
      success: true,
      expired_count: expiredRegistrationIds.length,
      lockers_freed: lockerIdsToFree.length,
      message: `Expired ${expiredRegistrationIds.length} users and freed ${lockerIdsToFree.length} lockers.`,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
