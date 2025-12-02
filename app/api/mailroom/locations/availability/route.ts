//fetching locker availability based on locations in mailroom service registration
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

export async function GET(req: Request) {
  try {
    const client = supabaseAdmin;

    // Fetch all available lockers (only location_id needed)
    const { data, error } = await client
      .from("location_lockers")
      .select("location_id")
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching locker availability:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group and count by location_id
    const counts: Record<string, number> = {};

    if (data) {
      data.forEach((locker: any) => {
        const locId = locker.location_id;
        counts[locId] = (counts[locId] || 0) + 1;
      });
    }

    return NextResponse.json(counts, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in availability route:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
