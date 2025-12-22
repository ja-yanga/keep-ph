import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createBrowserClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const supabase = await createSupabaseServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createBrowserClient();

    const [
      regsRes,
      usersRes,
      kycRes,
      lockersRes,
      assignedRes,
      plansRes,
      locationsRes,
      subsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("mailroom_registration_table")
        .select(
          "mailroom_registration_id, user_id, mailroom_location_id, mailroom_plan_id, mailroom_registration_code, mailroom_registration_status, mailroom_registration_created_at",
        )
        .order("mailroom_registration_created_at", { ascending: false }),
      supabaseAdmin
        .from("users_table")
        .select("users_id, users_email, mobile_number"),
      supabaseAdmin
        .from("user_kyc_table")
        .select(
          "user_kyc_id, user_id, user_kyc_first_name, user_kyc_last_name",
        ),
      supabaseAdmin.from("location_locker_table").select("*"),
      supabaseAdmin.from("mailroom_assigned_locker_table").select("*"),
      supabaseAdmin.from("mailroom_plan_table").select("*"),
      supabaseAdmin.from("mailroom_location_table").select("*"),
      supabaseAdmin
        .from("subscription_table")
        .select(
          "subscription_id, mailroom_registration_id, subscription_started_at, subscription_expires_at, subscription_billing_cycle",
        ),
    ]);

    if (regsRes.error) {
      return NextResponse.json(
        { error: regsRes.error.message },
        { status: 500 },
      );
    }
    if (usersRes.error) {
      return NextResponse.json(
        { error: usersRes.error.message },
        { status: 500 },
      );
    }
    if (kycRes.error) {
      return NextResponse.json(
        { error: kycRes.error.message },
        { status: 500 },
      );
    }
    if (lockersRes.error) {
      return NextResponse.json(
        { error: lockersRes.error.message },
        { status: 500 },
      );
    }
    if (assignedRes.error) {
      return NextResponse.json(
        { error: assignedRes.error.message },
        { status: 500 },
      );
    }
    if (plansRes.error) {
      return NextResponse.json(
        { error: plansRes.error.message },
        { status: 500 },
      );
    }
    if (locationsRes.error) {
      return NextResponse.json(
        { error: locationsRes.error.message },
        { status: 500 },
      );
    }
    if (subsRes.error) {
      return NextResponse.json(
        { error: subsRes.error.message },
        { status: 500 },
      );
    }

    const regs = Array.isArray(regsRes.data) ? regsRes.data : [];
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    const kycRows = Array.isArray(kycRes.data) ? kycRes.data : [];
    const lockers = Array.isArray(lockersRes.data) ? lockersRes.data : [];
    const assigned = Array.isArray(assignedRes.data) ? assignedRes.data : [];
    const plans = Array.isArray(plansRes.data) ? plansRes.data : [];
    const locations = Array.isArray(locationsRes.data) ? locationsRes.data : [];
    const subs = Array.isArray(subsRes.data) ? subsRes.data : [];

    const userMap: Record<string, { email?: string; mobile?: string | null }> =
      {};
    for (const u of users) {
      const rec = u as Record<string, unknown>;
      const id = String(rec.users_id ?? "");
      if (!id) continue;
      userMap[id] = {
        email: String(rec.users_email ?? ""),
        mobile: (rec.mobile_number as string | null) ?? null,
      };
    }

    const kycMap: Record<string, { first?: string; last?: string }> = {};
    for (const k of kycRows) {
      const rec = k as Record<string, unknown>;
      const uid = String(rec.user_id ?? "");
      if (!uid) continue;
      kycMap[uid] = {
        first: rec.user_kyc_first_name as string | undefined,
        last: rec.user_kyc_last_name as string | undefined,
      };
    }

    const subsMap: Record<
      string,
      {
        started?: string | null;
        expires?: string | null;
        billing_cycle?: string | null;
      }
    > = {};
    for (const s of subs) {
      const rec = s as Record<string, unknown>;
      const key = String(rec.mailroom_registration_id ?? "");
      if (!key) continue;
      subsMap[key] = {
        started: rec.subscription_started_at as string | undefined,
        expires: rec.subscription_expires_at as string | undefined,
        billing_cycle: (rec.subscription_billing_cycle as string) ?? null,
      };
    }

    const assignedCountMap: Record<string, number> = {};
    for (const a of assigned) {
      const rec = a as Record<string, unknown>;
      const regId = String(rec.mailroom_registration_id ?? "");
      if (!regId) continue;
      assignedCountMap[regId] = (assignedCountMap[regId] ?? 0) + 1;
    }

    const normalizedRegs = regs.map((r) => {
      const row = r as Record<string, unknown>;
      const id = String(row.mailroom_registration_id ?? "");
      const uid = String(row.user_id ?? "");
      const email = userMap[uid]?.email ?? "";
      const mobile = userMap[uid]?.mobile ?? null;
      const kycRec = kycMap[uid] ?? null;
      let fullName = "";
      if (kycRec && (kycRec.first || kycRec.last)) {
        fullName = `${String(kycRec.first ?? "").trim()} ${String(
          kycRec.last ?? "",
        ).trim()}`.trim();
      } else if (email) {
        fullName = String(email).split("@")[0] ?? "";
      }
      const createdAt = String(row.mailroom_registration_created_at ?? "");
      const sub = subsMap[id];
      let months = 0;
      if (sub?.billing_cycle) {
        const bc = String(sub.billing_cycle).toUpperCase().trim();
        if (bc === "MONTHLY") months = 1;
        else if (bc === "QUARTERLY") months = 3;
        else if (bc === "ANNUAL") months = 12;
      } else if (sub?.started && sub?.expires) {
        const started = dayjs(sub.started);
        const expires = dayjs(sub.expires);
        months = Math.max(0, expires.diff(started, "month"));
      }

      return {
        id,
        user_id: uid,
        mailroom_code: String(row.mailroom_registration_code ?? ""),
        full_name: fullName,
        mobile,
        kyc_first_name: kycRec?.first ?? null,
        kyc_last_name: kycRec?.last ?? null,
        email,
        created_at: createdAt,
        months,
        locker_qty: assignedCountMap[id] ?? 0,
        location_id: String(row.mailroom_location_id ?? ""),
        plan_id: String(row.mailroom_plan_id ?? ""),
        mailroom_status: Boolean(row.mailroom_registration_status ?? true),
      };
    });

    const normalizedLockers = lockers.map((l) => {
      const row = l as Record<string, unknown>;
      return {
        id: String(row.location_locker_id ?? ""),
        locker_code: String(row.location_locker_code ?? ""),
        is_available: Boolean(row.location_locker_is_available ?? true),
        location_id: String(row.mailroom_location_id ?? ""),
        created_at: String(row.location_locker_created_at ?? ""),
      };
    });

    const normalizedAssigned = assigned.map((a) => {
      const row = a as Record<string, unknown>;
      return {
        id: String(row.mailroom_assigned_locker_id ?? ""),
        registration_id: String(row.mailroom_registration_id ?? ""),
        locker_id: String(row.location_locker_id ?? ""),
        status: String(row.mailroom_assigned_locker_status ?? "Empty"),
        assigned_at: String(row.mailroom_assigned_locker_assigned_at ?? ""),
      };
    });

    const normalizedPlans = plans.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        id: String(row.mailroom_plan_id ?? ""),
        name: String(row.mailroom_plan_name ?? ""),
        price: Number(row.mailroom_plan_price ?? 0),
      };
    });

    const normalizedLocations = locations.map((loc) => {
      const row = loc as Record<string, unknown>;
      return {
        id: String(row.mailroom_location_id ?? ""),
        name: String(row.mailroom_location_name ?? ""),
        region: row.mailroom_location_region ?? null,
        city: row.mailroom_location_city ?? null,
        barangay: row.mailroom_location_barangay ?? null,
        zip: row.mailroom_location_zip ?? null,
        total_lockers: Number(row.mailroom_location_total_lockers ?? 0),
      };
    });

    return NextResponse.json(
      {
        registrations: normalizedRegs,
        lockers: normalizedLockers,
        assignedLockers: normalizedAssigned,
        plans: normalizedPlans,
        locations: normalizedLocations,
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
