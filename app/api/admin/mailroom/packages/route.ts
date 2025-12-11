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

export async function GET() {
  const { data, error } = await supabase
    .from("mailroom_packages")
    // Added locker:location_lockers(...) to fetch the code
    .select(
      "*, registration:mailroom_registrations(id, full_name, email), locker:location_lockers(id, locker_code)"
    )
    .order("received_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
