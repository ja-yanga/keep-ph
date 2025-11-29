import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize client directly (RLS disabled mode)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { locker_code, is_available } = body;

  // We are not allowing location_id update here to simplify the counter logic
  const { data, error } = await supabase
    .from("location_lockers")
    .update({ locker_code, is_available })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Get locker details first to know which location to decrement
  const { data: locker } = await supabase
    .from("location_lockers")
    .select("location_id")
    .eq("id", id)
    .single();

  if (!locker) {
    return NextResponse.json({ error: "Locker not found" }, { status: 404 });
  }

  // 2. Delete the locker
  const { error } = await supabase
    .from("location_lockers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Decrement total_lockers
  if (locker.location_id) {
    const { data: loc } = await supabase
      .from("mailroom_locations")
      .select("total_lockers")
      .eq("id", locker.location_id)
      .single();

    if (loc) {
      const newTotal = Math.max(0, (loc.total_lockers || 0) - 1);
      await supabase
        .from("mailroom_locations")
        .update({ total_lockers: newTotal })
        .eq("id", locker.location_id);
    }
  }

  return NextResponse.json({ message: "Locker deleted successfully" });
}
