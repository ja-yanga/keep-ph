// filepath: c:\Users\Raitoningu\code\keep-ph\app\api\mailroom\locations\availability\route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

type LockerRow = {
  mailroom_location_id: string | null;
};

export async function GET(_req: Request) {
  void _req;
  try {
    const client = supabaseAdmin;

    const { data, error } = await client
      .from("location_locker_table")
      .select("mailroom_location_id")
      .eq("location_locker_is_available", true);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch locker availability" },
        { status: 500 },
      );
    }

    const counts: Record<string, number> = {};
    const rows = Array.isArray(data) ? (data as LockerRow[]) : [];

    for (const row of rows) {
      const locId = row.mailroom_location_id;
      if (!locId) continue;
      counts[locId] = (counts[locId] || 0) + 1;
    }

    return NextResponse.json({ data: counts }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
