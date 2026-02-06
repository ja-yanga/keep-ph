import { NextResponse } from "next/server";
import dayjs from "dayjs";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  MailroomRegistrationTableRow,
  UsersTableRow,
  UserKYCTableRow,
  LocationLockerRow,
  LocationLockerAssignedRow,
  MailroomPlanTableRow,
  MailroomLocationRow,
  SubscriptionTableRow,
} from "@/utils/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

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

    const regs = (regsRes.data as MailroomRegistrationTableRow[]) ?? [];
    const users = (usersRes.data as UsersTableRow[]) ?? [];
    const kycRows = (kycRes.data as UserKYCTableRow[]) ?? [];
    const lockers = (lockersRes.data as LocationLockerRow[]) ?? [];
    const assigned = (assignedRes.data as LocationLockerAssignedRow[]) ?? [];
    const plans = (plansRes.data as MailroomPlanTableRow[]) ?? [];
    const locations = (locationsRes.data as MailroomLocationRow[]) ?? [];
    const subs = (subsRes.data as SubscriptionTableRow[]) ?? [];

    const userMap: Record<string, { email?: string; mobile?: string | null }> =
      {};
    for (const u of users) {
      if (!u.users_id) continue;
      userMap[u.users_id] = {
        email: u.users_email ?? "",
        mobile: u.mobile_number ?? null,
      };
    }

    const kycMap: Record<string, { first?: string; last?: string }> = {};
    for (const k of kycRows) {
      if (!k.user_id) continue;
      kycMap[k.user_id] = {
        first: k.user_kyc_first_name ?? undefined,
        last: k.user_kyc_last_name ?? undefined,
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
      if (!s.mailroom_registration_id) continue;
      subsMap[s.mailroom_registration_id] = {
        started: s.subscription_started_at,
        expires: s.subscription_expires_at,
        billing_cycle: s.subscription_billing_cycle,
      };
    }

    const assignedCountMap: Record<string, number> = {};
    for (const a of assigned) {
      if (!a.mailroom_registration_id) continue;
      const regId = a.mailroom_registration_id;
      assignedCountMap[regId] = (assignedCountMap[regId] ?? 0) + 1;
    }

    const plansMap: Record<string, { name: string }> = {};
    for (const p of plans) {
      if (p.mailroom_plan_id)
        plansMap[p.mailroom_plan_id] = { name: p.mailroom_plan_name };
    }

    const locationsMap: Record<string, { name: string }> = {};
    for (const l of locations) {
      if (l.mailroom_location_id)
        locationsMap[l.mailroom_location_id] = {
          name: l.mailroom_location_name,
        };
    }

    const normalizedRegs = regs.map((r) => {
      const id = r.mailroom_registration_id;
      const uid = r.user_id;
      const email = userMap[uid]?.email ?? "";
      const mobile = userMap[uid]?.mobile ?? null;
      const kycRec = kycMap[uid] ?? null;
      let fullName = "";
      if (kycRec && (kycRec.first || kycRec.last)) {
        fullName = `${(kycRec.first ?? "").trim()} ${(
          kycRec.last ?? ""
        ).trim()}`.trim();
      } else if (email) {
        fullName = email.split("@")[0] ?? "";
      }
      const createdAt = r.mailroom_registration_created_at ?? "";
      const sub = subsMap[id];
      let months = 0;
      if (sub?.billing_cycle) {
        const bc = sub.billing_cycle.toUpperCase().trim();
        if (bc === "MONTHLY") months = 1;
        else if (bc === "QUARTERLY") months = 3;
        else if (bc === "ANNUAL") months = 12;
      } else if (sub?.started && sub?.expires) {
        const started = dayjs(sub.started);
        const expires = dayjs(sub.expires);
        months = Math.max(0, expires.diff(started, "month"));
      }

      const plan_id = r.mailroom_plan_id ?? null;
      const location_id = r.mailroom_location_id ?? null;

      const mailroom_status = Boolean(r.mailroom_registration_status ?? true);
      const expiresAt = dayjs(createdAt).add(months, "month");
      const is_active = mailroom_status && dayjs().isBefore(expiresAt);

      return {
        id,
        user_id: uid,
        mailroom_code: r.mailroom_registration_code ?? null,
        full_name: fullName,
        phone_number: mobile,
        kyc_first_name: kycRec?.first ?? null,
        kyc_last_name: kycRec?.last ?? null,
        email,
        created_at: createdAt,
        months,
        locker_qty: assignedCountMap[id] ?? 0,
        location_id,
        plan_id,
        mailroom_status,
        is_active,
        plan_name: plan_id ? plansMap[plan_id]?.name : null,
        location_name: location_id ? locationsMap[location_id]?.name : null,
      };
    });

    const normalizedLockers = lockers.map((l) => {
      return {
        id: l.location_locker_id,
        locker_code: l.location_locker_code ?? "",
        is_available: Boolean(l.location_locker_is_available ?? true),
        location_id: l.mailroom_location_id ?? "",
        created_at: l.location_locker_created_at ?? "",
      };
    });

    const normalizedAssigned = assigned.map((a) => {
      return {
        id: a.mailroom_assigned_locker_id,
        registration_id: a.mailroom_registration_id,
        locker_id: a.location_locker_id ?? "",
        status: a.mailroom_assigned_locker_status ?? "Empty",
        assigned_at: a.mailroom_assigned_locker_assigned_at ?? "",
      };
    });

    const normalizedPlans = plans.map((p) => {
      return {
        id: p.mailroom_plan_id,
        name: p.mailroom_plan_name,
        price: Number(p.mailroom_plan_price ?? 0),
      };
    });

    const normalizedLocations = locations.map((loc) => {
      return {
        id: loc.mailroom_location_id,
        name: loc.mailroom_location_name,
        region: loc.mailroom_location_region ?? null,
        city: loc.mailroom_location_city ?? null,
        barangay: loc.mailroom_location_barangay ?? null,
        zip: loc.mailroom_location_zip ?? null,
        total_lockers: Number(loc.mailroom_location_total_lockers ?? 0),
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
            "private, max-age=60, s-maxage=60, stale-while-revalidate=300",
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
