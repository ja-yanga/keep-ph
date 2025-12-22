import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function GET() {
  try {
    // run independent queries in parallel
    const [
      pendingRes,
      storedRes,
      subRes,
      totalLockersRes,
      assignedLockersRes,
      recentPackagesRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("mailroom_packages")
        .select("*", { count: "exact", head: true })
        .in("status", [
          "REQUEST_TO_SCAN",
          "REQUEST_TO_RELEASE",
          "REQUEST_TO_DISPOSE",
        ]),
      supabaseAdmin
        .from("mailroom_packages")
        .select("*", { count: "exact", head: true })
        .in("status", [
          "STORED",
          "REQUEST_TO_SCAN",
          "REQUEST_TO_RELEASE",
          "REQUEST_TO_DISPOSE",
        ]),
      supabaseAdmin
        .from("mailroom_registrations")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("location_lockers")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("mailroom_assigned_lockers")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("mailroom_packages")
        .select("id, package_name, received_at, status, package_type")
        .order("received_at", { ascending: false })
        .limit(5),
    ]);

    const pendingCount = pendingRes.count ?? 0;
    const storedCount = storedRes.count ?? 0;
    const subCount = subRes.count ?? 0;
    const totalLockers = totalLockersRes.count ?? 0;
    const assignedLockers = assignedLockersRes.count ?? 0;
    const recentPackages = recentPackagesRes.data ?? [];

    return NextResponse.json({
      pendingRequests: pendingCount,
      storedPackages: storedCount,
      totalSubscribers: subCount,
      lockerStats: { total: totalLockers, assigned: assignedLockers },
      recentPackages,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
