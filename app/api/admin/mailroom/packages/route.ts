import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize client directly with env vars since RLS is disabled
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  const body = await request.json();

  const { data, error } = await supabase
    .from("mailroom_packages")
    .insert({
      tracking_number: body.tracking_number,
      registration_id: body.registration_id,
      locker_id: body.locker_id || null,
      package_type: body.package_type,
      status: body.status,
      notes: body.notes,
      mailroom_full: body.mailroom_full,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
