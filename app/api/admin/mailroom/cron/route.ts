import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import dayjs from "dayjs";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST() {
  try {
    // 1. Fetch all active registrations
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from("mailroom_registrations")
      .select("id, created_at, months, mailroom_status, auto_renew")
      .eq("mailroom_status", true);

    if (fetchError) throw fetchError;

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        message: "No active subscriptions to check.",
      });
    }

    const expiredRegistrationIds: string[] = [];
    const renewedRegistrationIds: string[] = [];

    // 2. Filter for expired vs renewing
    registrations.forEach((reg) => {
      const expiresAt = dayjs(reg.created_at).add(reg.months, "month");

      // Check if the period has ended
      if (dayjs().isAfter(expiresAt)) {
        if (reg.auto_renew !== false) {
          // Auto-renew is ON -> Add to renew list
          renewedRegistrationIds.push(reg.id);
        } else {
          // Auto-renew is OFF -> Add to expire list
          expiredRegistrationIds.push(reg.id);
        }
      }
    });

    if (
      expiredRegistrationIds.length === 0 &&
      renewedRegistrationIds.length === 0
    ) {
      return NextResponse.json({ message: "No subscriptions needed updates." });
    }

    // --- HANDLE EXPIRATIONS (Existing Logic) ---
    let lockersFreed = 0;

    if (expiredRegistrationIds.length > 0) {
      // 3. Find assigned lockers for these expired users
      const { data: assignments, error: assignError } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .select("locker_id")
        .in("registration_id", expiredRegistrationIds);

      if (assignError) throw assignError;

      const lockerIdsToFree = assignments
        ? assignments.map((a) => a.locker_id)
        : [];
      lockersFreed = lockerIdsToFree.length;

      // A. Mark registrations as inactive
      const { error: updateRegError } = await supabaseAdmin
        .from("mailroom_registrations")
        .update({ mailroom_status: false })
        .in("id", expiredRegistrationIds);

      if (updateRegError) throw updateRegError;

      // B. Delete the assignments
      const { error: deleteAssignError } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .delete()
        .in("registration_id", expiredRegistrationIds);

      if (deleteAssignError) throw deleteAssignError;

      // C. Mark lockers available
      if (lockerIdsToFree.length > 0) {
        const { error: updateLockerError } = await supabaseAdmin
          .from("location_lockers")
          .update({ is_available: true })
          .in("id", lockerIdsToFree);

        if (updateLockerError) throw updateLockerError;
      }
    }

    // --- HANDLE RENEWALS (New Logic) ---
    if (renewedRegistrationIds.length > 0) {
      // Update created_at to NOW() to start a new cycle
      const { error: renewError } = await supabaseAdmin
        .from("mailroom_registrations")
        .update({ created_at: new Date().toISOString() })
        .in("id", renewedRegistrationIds);

      if (renewError) throw renewError;
    }

    return NextResponse.json({
      success: true,
      expired_count: expiredRegistrationIds.length,
      renewed_count: renewedRegistrationIds.length,
      lockers_freed: lockersFreed,
      message: `Processed: ${expiredRegistrationIds.length} expired, ${renewedRegistrationIds.length} renewed subscriptions. Freed ${lockersFreed} lockers.`,
    });
  } catch (error: unknown) {
    console.error("Cron job error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
