import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize client directly.
// Note: This client uses the ANON key. Since RLS is disabled, it has full access.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // No await createClient() needed
  const { data, error } = await supabase
    .from("location_lockers")
    .select("*, location:mailroom_locations(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  // No await createClient() needed
  const body = await req.json();
  const { location_id, locker_code, is_available } = body;

  if (!location_id || !locker_code) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // 1. Create Locker
  const { data, error } = await supabase
    .from("location_lockers")
    .insert([{ location_id, locker_code, is_available }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Increment total_lockers in mailroom_locations
  const { data: loc } = await supabase
    .from("mailroom_locations")
    .select("total_lockers")
    .eq("id", location_id)
    .single();

  if (loc) {
    await supabase
      .from("mailroom_locations")
      .update({ total_lockers: (loc.total_lockers || 0) + 1 })
      .eq("id", location_id);
  }

  return NextResponse.json(data);
}
