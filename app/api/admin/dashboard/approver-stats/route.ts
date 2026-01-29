import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin.rpc("admin_approver_stats");

    if (error) {
      console.error("RPC admin_approver_stats error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // supabase sometimes returns array wrapper
    const payload = Array.isArray(data) ? (data[0] ?? data) : (data ?? {});

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          "private, max-age=30, s-maxage=30, stale-while-revalidate=60",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("approver-stats GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
