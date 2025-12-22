import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    const nowIso = new Date().toISOString();

    const { data: subsExpiring, error: fetchErr } = await supabaseAdmin
      .from("subscription_table")
      .select(
        "subscription_id, mailroom_registration_id, subscription_expires_at, subscription_auto_renew, subscription_billing_cycle",
      )
      .lte("subscription_expires_at", nowIso);

    if (fetchErr) throw fetchErr;

    if (!Array.isArray(subsExpiring) || subsExpiring.length === 0) {
      return NextResponse.json({ message: "No subscriptions to process." });
    }

    const toExpire: string[] = [];
    const toRenew: { subscription_id: string; billing_cycle: string }[] = [];

    for (const s of subsExpiring) {
      const rec = s as Record<string, unknown>;
      const subId = String(rec.subscription_id ?? "");
      const regId = String(rec.mailroom_registration_id ?? "");
      const autoRenew = Boolean(rec.subscription_auto_renew ?? false);
      const billing = String(rec.subscription_billing_cycle ?? "MONTHLY");

      if (!regId || !subId) continue;

      if (autoRenew) {
        toRenew.push({ subscription_id: subId, billing_cycle: billing });
      } else {
        toExpire.push(regId);
      }
    }

    let lockersFreed = 0;
    if (toExpire.length > 0) {
      const { data: assignments, error: assignErr } = await supabaseAdmin
        .from("mailroom_assigned_locker_table")
        .select(
          "mailroom_assigned_locker_id, location_locker_id, mailroom_registration_id",
        )
        .in("mailroom_registration_id", toExpire);

      if (assignErr) throw assignErr;

      const lockerIds: string[] = [];
      if (Array.isArray(assignments) && assignments.length > 0) {
        for (const a of assignments) {
          const rec = a as Record<string, unknown>;
          const lid = String(rec.location_locker_id ?? "");
          if (lid) lockerIds.push(lid);
        }
      }

      if (toExpire.length > 0) {
        const { error: updRegErr } = await supabaseAdmin
          .from("mailroom_registration_table")
          .update({ mailroom_registration_status: false })
          .in("mailroom_registration_id", toExpire);
        if (updRegErr) throw updRegErr;
      }

      if (Array.isArray(assignments) && assignments.length > 0) {
        const { error: delAssignErr } = await supabaseAdmin
          .from("mailroom_assigned_locker_table")
          .delete()
          .in("mailroom_registration_id", toExpire);
        if (delAssignErr) throw delAssignErr;
      }

      if (lockerIds.length > 0) {
        const uniqueLockerIds = Array.from(new Set(lockerIds));
        const { error: updLockerErr } = await supabaseAdmin
          .from("location_locker_table")
          .update({ location_locker_is_available: true })
          .in("location_locker_id", uniqueLockerIds);
        if (updLockerErr) throw updLockerErr;
        lockersFreed = uniqueLockerIds.length;
      }
    }

    let renewedCount = 0;
    if (toRenew.length > 0) {
      const updates = toRenew.map((r) => {
        const bc = String(r.billing_cycle ?? "MONTHLY").toUpperCase();
        let months = 1;
        if (bc === "QUARTERLY") months = 3;
        else if (bc === "ANNUAL") months = 12;
        const started = new Date().toISOString();
        const expires = dayjs().add(months, "month").toISOString();
        return supabaseAdmin
          .from("subscription_table")
          .update({
            subscription_started_at: started,
            subscription_expires_at: expires,
            subscription_updated_at: new Date().toISOString(),
          })
          .eq("subscription_id", r.subscription_id);
      });

      const results = await Promise.all(updates);
      for (const res of results) {
        if (res.error) throw res.error;
      }
      renewedCount = toRenew.length;
    }

    return NextResponse.json({
      success: true,
      expired_count: toExpire.length,
      renewed_count: renewedCount,
      lockers_freed: lockersFreed,
      message: `Processed: expired=${toExpire.length}, renewed=${renewedCount}, lockers_freed=${lockersFreed}`,
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Cron processing failed" },
      { status: 500 },
    );
  }
}
