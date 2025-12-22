// filepath: c:\Users\Raitoningu\code\keep-ph\app\api\mailroom\locations\availability\route.ts
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

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
