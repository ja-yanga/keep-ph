import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function GET() {
  try {
    // Run independent queries in parallel
    const [regsRes, lockersRes, assignedRes, plansRes, locationsRes] =
      await Promise.all([
        supabaseAdmin
          .from("mailroom_registrations")
          // Request the plan relation but avoid selecting a 'months' column
          // (the DB doesn't have that column name) — fetch only known fields.
          .select(
            `
            *,
            plan:mailroom_plans (
              id,
              name,
              can_receive_mail,
              can_receive_parcels
            ),
            location:mailroom_locations (
              id,
              name,
              city,
              region,
              barangay,
              zip
            )
          `,
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("location_lockers").select("*"),
        supabaseAdmin.from("mailroom_assigned_lockers").select("*"),
        supabaseAdmin.from("mailroom_plans").select("*"),
        supabaseAdmin.from("mailroom_locations").select("*"),
      ]);

    if (regsRes.error) throw regsRes.error;
    if (lockersRes.error) throw lockersRes.error;
    if (assignedRes.error) throw assignedRes.error;
    if (plansRes.error) throw plansRes.error;
    if (locationsRes.error) throw locationsRes.error;

    return NextResponse.json(
      {
        registrations: regsRes.data ?? [],
        lockers: lockersRes.data ?? [],
        assignedLockers: assignedRes.data ?? [],
        plans: plansRes.data ?? [],
        locations: locationsRes.data ?? [],
      },
      {
        headers: {
          // short server cache to help repeated loads in prod/CDN
          "Cache-Control":
            "private, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error: unknown) {
    console.error("registrations GET error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
