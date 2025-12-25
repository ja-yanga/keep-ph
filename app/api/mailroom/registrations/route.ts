import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const isAPI = true;
    const { user, supabase } = await getAuthenticatedUser(isAPI);

    const userId = user.id;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const offset = (page - 1) * limit;
    const compact = url.searchParams.get("compact") === "1";

    const selectFields = compact
      ? `mailroom_registration_id, mailroom_registration_code, mailroom_registration_created_at, mailroom_location_table ( mailroom_location_id, mailroom_location_name ), mailroom_plan_table ( mailroom_plan_id, mailroom_plan_name ), subscription_table ( subscription_expires_at, subscription_auto_renew ) , users_table ( users_id, users_email, user_kyc_table ( user_kyc_first_name, user_kyc_last_name ) )`
      : `
        mailroom_registration_id,
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status,
        mailroom_registration_created_at,
        mailroom_registration_updated_at,
        mailroom_location_table ( mailroom_location_id, mailroom_location_name, mailroom_location_city, mailroom_location_region, mailroom_location_barangay, mailroom_location_zip ),
        mailroom_plan_table ( mailroom_plan_id, mailroom_plan_name, mailroom_plan_price ),
        mailbox_item_table ( mailbox_item_id, mailbox_item_status ),
        subscription_table ( subscription_id, subscription_expires_at, subscription_auto_renew, subscription_started_at ),
        users_table ( users_id, users_email, users_avatar_url, mobile_number, user_kyc_table ( user_kyc_first_name, user_kyc_last_name, user_kyc_status ) )
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
        { error: error.message ?? "Failed to load registrations" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        data: data ?? [],
        meta: {
          total: count ?? (Array.isArray(data) ? data.length : 0),
          page,
          limit,
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
