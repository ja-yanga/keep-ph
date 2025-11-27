import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      full_name,
      email,
      mobile,
      locationId,
      planId,
      lockerQty = 1,
      months = 1,
      notes = null,
    } = body ?? {};

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // --- Resolve locationId ---
    if (!isUuid(locationId)) {
      const q = String(locationId ?? "").trim();
      const { data: locs } = await supabase
        .from("mailroom_locations")
        .select("id")
        .or(
          `name.ilike.%${q}%,city.ilike.%${q}%,region.ilike.%${q}%,barangay.ilike.%${q}%`
        )
        .limit(1);

      if (!locs?.length)
        return NextResponse.json(
          { error: `Unknown mailroom location "${locationId}"` },
          { status: 400 }
        );

      locationId = locs[0].id;
    }

    // --- Resolve planId ---
    if (!isUuid(planId)) {
      const q = String(planId ?? "").trim();
      const { data: plans } = await supabase
        .from("mailroom_plans")
        .select("id")
        .ilike("name", `%${q}%`)
        .limit(1);

      if (!plans?.length)
        return NextResponse.json(
          { error: `Unknown plan "${planId}"` },
          { status: 400 }
        );

      planId = plans[0].id;
    }

    if (!isUuid(locationId) || !isUuid(planId)) {
      return NextResponse.json(
        { error: "Failed to resolve locationId or planId to UUIDs" },
        { status: 400 }
      );
    }

    // --- Final record ---
    const record = {
      user_id: userId,
      full_name: full_name || null,
      email: email || null,
      mobile: mobile || null,
      location_id: locationId,
      plan_id: planId,
      locker_qty: Number(lockerQty) || 1,
      months: Number(months) || 1,
      notes: notes ?? null,
    };

    const client = supabaseAdmin;

    const { data, error } = await client
      .from("mailroom_registrations")
      .insert([record])
      .select("*");

    if (error) {
      console.error("mailroom register error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
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
