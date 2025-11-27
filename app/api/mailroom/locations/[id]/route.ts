import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH(
  req: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));

    let id = params?.id ?? body?.id;
    if (!id) {
      try {
        const parsed = new URL(req.url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const idx = parts.lastIndexOf("locations");
        if (idx >= 0 && parts.length > idx + 1) id = parts[idx + 1];
        else id = parts[parts.length - 1];
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const { name, region, city, barangay, zip, total_lockers } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (region !== undefined) updates.region = region || null;
    if (city !== undefined) updates.city = city || null;
    if (barangay !== undefined) updates.barangay = barangay || null;
    if (zip !== undefined) updates.zip = zip || null;
    if (total_lockers !== undefined)
      updates.total_lockers = Number(total_lockers) || 0;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // Fetch current location first to compare total_lockers
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("mailroom_locations")
      .select("total_lockers")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const oldTotal = current.total_lockers ?? 0;
    const newTotal = updates.total_lockers ?? oldTotal;

    // Update the location
    const { data, error } = await supabaseAdmin
      .from("mailroom_locations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating location:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If total_lockers increased, generate new lockers
    if (newTotal > oldTotal) {
      const lockersToCreate = [];
      for (let i = oldTotal + 1; i <= newTotal; i++) {
        lockersToCreate.push({
          location_id: id,
          locker_code: `L${i.toString().padStart(3, "0")}`,
          is_available: true,
        });
      }

      if (lockersToCreate.length > 0) {
        const { error: lockerError } = await supabaseAdmin
          .from("location_lockers")
          .insert(lockersToCreate);

        if (lockerError) {
          console.error("Error creating new lockers:", lockerError);
        }
      }
    }

    return NextResponse.json(
      { message: "Location updated", data },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "Unexpected error in PATCH /api/mailroom/locations/[id]:",
      err
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
