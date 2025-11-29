import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location_id, total } = body;

    if (!location_id || !total) {
      return NextResponse.json(
        { error: "Missing location_id or total" },
        { status: 400 }
      );
    }

    const lockers = [];
    for (let i = 1; i <= total; i++) {
      const code = `L${i.toString().padStart(3, "0")}`;
      lockers.push({
        location_id,
        locker_code: code,
        is_available: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("location_lockers")
      .insert(lockers);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
