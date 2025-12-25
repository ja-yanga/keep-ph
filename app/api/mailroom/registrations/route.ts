import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const isAPI = true;
    const { user } = await getAuthenticatedUser(isAPI);

    const userId = user.id;

    // Use RPC function to get registrations
    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin.rpc(
      "get_user_mailroom_registrations",
      {
        input_user_id: userId,
      },
    );

    if (error) {
      console.error("registrations RPC error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to load registrations" },
        { status: 500 },
      );
    }

    // Parse data if it's a string, otherwise use as is
    let registrations: unknown[] = [];
    try {
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      registrations = Array.isArray(payload) ? payload : [];
    } catch (parseError) {
      console.error("Failed to parse RPC response:", parseError);
      registrations = [];
    }

    return NextResponse.json(
      {
        data: registrations,
        meta: {
          total: registrations.length,
          page: 1,
          limit: registrations.length,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (err: unknown) {
    // Handle authentication errors with proper 401 response
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("registrations route unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
