import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Count Pending Requests (Action Items)
    const { count: pendingCount } = await supabaseAdmin
      .from("mailroom_packages")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "REQUEST_TO_SCAN",
        "REQUEST_TO_RELEASE",
        "REQUEST_TO_DISPOSE",
      ]);

    // 2. Count Stored Packages (Inventory)
    // UPDATED: Now includes STORED + any active REQUESTs (physically present)
    // Excludes: RELEASED, RETRIEVED, DISPOSED
    const { count: storedCount } = await supabaseAdmin
      .from("mailroom_packages")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "STORED",
        "REQUEST_TO_SCAN",
        "REQUEST_TO_RELEASE",
        "REQUEST_TO_DISPOSE",
      ]);

    // 3. Count Total Registrations (Subscribers)
    const { count: subCount } = await supabaseAdmin
      .from("mailroom_registrations")
      .select("*", { count: "exact", head: true });

    // 4. Locker Stats (Occupancy)
    const { count: totalLockers } = await supabaseAdmin
      .from("location_lockers")
      .select("*", { count: "exact", head: true });

    const { count: assignedLockers } = await supabaseAdmin
      .from("mailroom_assigned_lockers")
      .select("*", { count: "exact", head: true });

    // 5. Recent Packages (Last 5)
    const { data: recentPackages } = await supabaseAdmin
      .from("mailroom_packages")
      .select("id, tracking_number, received_at, status, package_type")
      .order("received_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      pendingRequests: pendingCount || 0,
      storedPackages: storedCount || 0,
      totalSubscribers: subCount || 0,
      lockerStats: {
        total: totalLockers || 0,
        assigned: assignedLockers || 0,
      },
      recentPackages: recentPackages || [],
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
