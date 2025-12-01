import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from("mailroom_registrations")
      .select(
        `
        id,
        user_id,
        full_name,
        email,
        mobile,
        created_at,
        months,
        locker_qty,
        location_id,
        plan_id,
        mailroom_locations (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin registrations fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to load registrations" },
        { status: 500 }
      );
    }

    const formattedData = data.map((reg: any) => ({
      ...reg,
      phone_number: reg.mobile,
      location_name: reg.mailroom_locations?.name || "Unknown Location",
    }));

    return NextResponse.json({ data: formattedData }, { status: 200 });
  } catch (err: any) {
    console.error("Admin registrations API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
