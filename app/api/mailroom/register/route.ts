import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // optional server key

// anon client (used for lookups if service role not provided)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// admin client (preferred for server-side writes if you have service role key)
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

const isUuid = (s: unknown) =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let {
      userId,
      locationId,
      planId,
      lockerQty = 1,
      months = 1,
      notes = null,
    } = body ?? {};

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Resolve locationId if a slug/name was sent (e.g. "bgc" or "greenhills")
    if (!isUuid(locationId)) {
      const q = String(locationId ?? "").trim();
      // try name match (case-insensitive)
      const { data: locs, error: locErr } = await supabase
        .from("mailroom_locations")
        .select("id,name,city,region,barangay")
        .or(
          `name.ilike.%${q}%,city.ilike.%${q}%,region.ilike.%${q}%,barangay.ilike.%${q}%`
        )
        .limit(1);

      if (locErr) {
        console.error("location lookup error:", locErr);
        return NextResponse.json(
          { error: "Location lookup failed" },
          { status: 500 }
        );
      }
      if (!locs || locs.length === 0) {
        return NextResponse.json(
          { error: `Unknown mailroom location "${locationId}"` },
          { status: 400 }
        );
      }
      locationId = locs[0].id;
    }

    // Resolve planId if a name was sent (e.g. "Personal")
    if (!isUuid(planId)) {
      const q = String(planId ?? "").trim();
      const { data: plans, error: planErr } = await supabase
        .from("mailroom_plans")
        .select("id,name,price")
        .ilike("name", `%${q}%`)
        .limit(1);

      if (planErr) {
        console.error("plan lookup error:", planErr);
        return NextResponse.json(
          { error: "Plan lookup failed" },
          { status: 500 }
        );
      }
      if (!plans || plans.length === 0) {
        return NextResponse.json(
          { error: `Unknown plan "${planId}"` },
          { status: 400 }
        );
      }
      planId = plans[0].id;
    }

    // Final validation
    if (!isUuid(locationId) || !isUuid(planId)) {
      return NextResponse.json(
        { error: "Failed to resolve locationId or planId to UUIDs" },
        { status: 400 }
      );
    }

    const record = {
      user_id: userId,
      location_id: locationId,
      plan_id: planId,
      locker_qty: Number(lockerQty) || 1,
      months: Number(months) || 1,
      notes: notes ?? null,
    };

    // Use admin client when available (bypass RLS). Otherwise use anon client (requires permissive policies).
    const client = supabaseAdmin;

    const { data, error } = await client
      .from("mailroom_registrations")
      .insert([record])
      .select();

    if (error) {
      console.error("mailroom register error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to register" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Registered successfully", data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("mailroom register unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
