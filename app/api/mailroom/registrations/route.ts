import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client for database operations

export async function GET(req: Request) {
  try {
    // 1. Authenticate User via Cookie (using @supabase/ssr)
    const supabase = createSupabaseServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // pagination / compact query params
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const offset = (page - 1) * limit;
    const compact = url.searchParams.get("compact") === "1";

    // fetch registrations for this user and include linked location & plan info
    // select only required fields; when compact=1 return fewer fields
    const selectFields = compact
      ? `mailroom_registration_id, mailroom_registration_code, mailroom_registration_created_at, mailroom_location_table ( mailroom_location_id, mailroom_location_name ), mailroom_plan_table ( mailroom_plan_id, mailroom_plan_name )`
      : `
        mailroom_registration_id,
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status,
        mailroom_registration_created_at,
        mailroom_location_table ( mailroom_location_id, mailroom_location_name, mailroom_location_city, mailroom_location_region, mailroom_location_barangay, mailroom_location_zip ),
        mailroom_plan_table ( mailroom_plan_id, mailroom_plan_name, mailroom_plan_price ),
        mailbox_item_table ( mailbox_item_id, mailbox_item_status )
      `;

    const { data, error, count } = await supabase
      .from("mailroom_registration_table")
      .select(selectFields, { count: "exact" })
      .eq("user_id", userId)
      .order("mailroom_registration_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("registrations fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to load registrations" },
        { status: 500 },
      );
    }

    // return paginated data + total count; set short s-maxage for server cache
    return NextResponse.json(
      { data, meta: { total: count ?? data?.length ?? 0, page, limit } },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    console.error("registrations route unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
