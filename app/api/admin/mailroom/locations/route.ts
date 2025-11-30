import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET all locations
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("mailroom_locations")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching locations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create new location
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, region, city, barangay, zip, total_lockers } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Insert location
    const { data, error } = await supabaseAdmin
      .from("mailroom_locations")
      .insert([
        {
          name,
          code: code || null, // Save the code
          region: region || null,
          city: city || null,
          barangay: barangay || null,
          zip: zip || null,
          total_lockers: total_lockers ?? 0,
        },
      ])
      .select();

    if (error || !data || data.length === 0) {
      console.error("Error creating location:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to create location" },
        { status: 500 }
      );
    }

    const locationId = data[0].id;
    const lockersToCreate = total_lockers ?? 0;

    if (lockersToCreate > 0) {
      // Determine prefix: "MKT-" or fallback to "L"
      const prefix = code ? `${code}-` : "L";

      const lockers = [];
      for (let i = 1; i <= lockersToCreate; i++) {
        lockers.push({
          location_id: locationId,
          locker_code: `${prefix}${i.toString().padStart(3, "0")}`,
          is_available: true,
        });
      }

      const { error: lockerError } = await supabaseAdmin
        .from("location_lockers")
        .insert(lockers);

      if (lockerError) {
        console.error("Error creating lockers:", lockerError);
      }
    }

    return NextResponse.json(
      { message: "Location created with lockers", data },
      { status: 201 }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
