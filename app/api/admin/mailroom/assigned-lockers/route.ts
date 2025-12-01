import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from(
      "mailroom_assigned_lockers"
    ).select(`
        id,
        registration_id,
        locker_id,
        status, 
        assigned_at,
        locker:location_lockers (
          id,
          locker_code,
          is_available
        ),
        registration:mailroom_registrations (
          id,
          full_name,
          email
        )
      `);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
