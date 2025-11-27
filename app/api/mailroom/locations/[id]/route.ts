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
    // parse body (if any)
    const body = await req.json().catch(() => ({}));

    // Prefer route params, fallback to body.id, then try to extract from req.url
    let id = params?.id ?? body?.id;
    if (!id) {
      try {
        const parsed = new URL(req.url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        // Attempt to locate the "locations" segment and take the next segment as id
        const idx = parts.lastIndexOf("locations");
        if (idx >= 0 && parts.length > idx + 1) {
          id = parts[idx + 1];
        } else {
          // fallback to last segment
          id = parts[parts.length - 1];
        }
      } catch (e) {
        // ignore URL parse errors
      }
    }

    console.log(
      "PATCH /api/mailroom/locations/[id] - params:",
      params,
      "extractedId:",
      id,
      "body:",
      body
    );

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

    if (!data) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
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
