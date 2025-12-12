import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications"; // Import the helper

// Initialize client directly with env vars since RLS is disabled
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req?: Request) {
  try {
    const url = req ? new URL(req.url) : new URL("");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const offset = (page - 1) * limit;
    const compact = url.searchParams.get("compact") === "1";

    // run the independent queries in parallel
    const [pkgsRes, regsRes, lockersRes, assignedRes] = await Promise.all([
      supabaseAdmin
        .from("mailroom_packages")
        .select(
          compact
            ? "id, package_name, status, package_type, received_at, registration:mailroom_registrations(id, full_name, email, mobile), locker:location_lockers(id, locker_code)"
            : "*, registration:mailroom_registrations(id, full_name, email, mobile, mailroom_code), locker:location_lockers(id, locker_code), package_photo, notes",
          { count: "exact" }
        )
        .order("received_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin
        .from("mailroom_registrations")
        // include the plan details under the same field name the frontend expects
        .select(
          "id, full_name, email, mobile, mailroom_code, mailroom_plans:mailroom_plans(name, can_receive_mail, can_receive_parcels)"
        ),
      supabaseAdmin
        .from("location_lockers")
        .select("id, locker_code, is_available"),
      supabaseAdmin
        .from("mailroom_assigned_lockers")
        .select("id, registration_id, locker_id, status"),
    ]);

    if (pkgsRes.error) throw pkgsRes.error;
    if (regsRes.error) throw regsRes.error;
    if (lockersRes.error) throw lockersRes.error;
    if (assignedRes.error) throw assignedRes.error;

    return NextResponse.json(
      {
        packages: pkgsRes.data,
        registrations: regsRes.data,
        lockers: lockersRes.data,
        assignedLockers: assignedRes.data,
        meta: {
          total: pkgsRes.count ?? pkgsRes.data?.length ?? 0,
          page,
          limit,
        },
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    console.error("packages GET error:", err);
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Require package_name (tracking_number was removed from schema)
    const packageName = body.package_name ?? null;
    if (!packageName) {
      return NextResponse.json(
        { error: "package_name is required" },
        { status: 400 }
      );
    }

    // 1. Insert Package
    const { data, error } = await supabase
      .from("mailroom_packages")
      .insert({
        package_name: packageName,
        registration_id: body.registration_id,
        locker_id: body.locker_id || null,
        package_type: body.package_type,
        status: body.status,
        notes: body.notes,
        mailroom_full: body.mailroom_full,
        package_photo: body.package_photo ?? null, // ADDED: store package_photo if provided
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Update Locker Status (if locker is assigned and status is provided)
    if (body.locker_id && body.locker_status) {
      const { error: lockerError } = await supabase
        .from("mailroom_assigned_lockers")
        .update({ status: body.locker_status })
        .eq("locker_id", body.locker_id)
        .eq("registration_id", body.registration_id);

      if (lockerError) {
        console.error("Failed to update locker status:", lockerError);
        // We don't return an error here to avoid failing the package creation,
        // but you could if strict consistency is required.
      }
    }

    // 3. SEND NOTIFICATION
    // We need to find the user_id linked to this registration
    const { data: registration } = await supabaseAdmin
      .from("mailroom_registrations")
      // CHANGED: Added mailroom_code to the select
      .select("user_id, full_name, mailroom_code")
      .eq("id", body.registration_id)
      .single();

    if (registration?.user_id) {
      await sendNotification(
        registration.user_id,
        "Package Arrived",
        `A new ${body.package_type} (${packageName}) has arrived at Mailroom ${
          registration.mailroom_code || "Unknown"
        }.`,
        "PACKAGE_ARRIVED",
        `/mailroom/${body.registration_id}` // CHANGED: Link to specific mailroom
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
