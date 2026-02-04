import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListActivityLogs } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: roleData } = await supabase.rpc("get_user_role", {
      input_user_id: user.id,
    });

    if (roleData !== "admin" && roleData !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");
    const entity_type = searchParams.get("entity_type");
    const action = searchParams.get("action");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const sort_by = searchParams.get("sort_by");
    const sort_direction = searchParams.get("sort_direction");

    const data = await adminListActivityLogs({
      limit,
      offset,
      search,
      entity_type,
      action,
      date_from,
      date_to,
      sort_by,
      sort_direction,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("API error fetching activity logs:", err);

    // Handle statement timeout (PostgreSQL error 57014)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "57014"
    ) {
      return NextResponse.json(
        {
          error:
            "The request timed out because the activity log table is too large. Please try refreshing or using more specific filters (like a date range or specific action).",
          code: "TIMEOUT",
        },
        { status: 408 },
      );
    }

    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
