import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Search endpoint for mailroom registrations (used in select/autocomplete components)
 * Supports search query parameter for filtering by email, name, or mailroom code
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const supabaseAdmin = createSupabaseServiceClient();

    // Build query with search filter
    const query = supabaseAdmin
      .from("mailroom_registration_table")
      .select(
        `
        mailroom_registration_id,
        mailroom_registration_code,
        user:users_table!mailroom_registration_table_user_id_fkey(
          users_id,
          users_email,
          mobile_number,
          user_kyc_table(
            user_kyc_first_name,
            user_kyc_last_name
          )
        ),
        mailroom_location:mailroom_location_table(
          mailroom_location_name
        ),
        mailroom_plan:mailroom_plan_table(
          mailroom_plan_name,
          mailroom_plan_can_receive_mail,
          mailroom_plan_can_receive_parcels
        )
      `,
      )
      .limit(limit)
      .order("mailroom_registration_created_at", { ascending: false });

    // Apply search filter if query provided
    if (searchQuery) {
      // Search in related tables using joins
      // We'll need to use a text search approach since Supabase doesn't support full-text search across joins easily
      // For now, we'll fetch and filter client-side, but with pagination
      // Better approach: use RPC function with ILIKE search
    }

    const { data, error } = await query;

    if (error) {
      console.error("Search registrations error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match component expectations
    const registrations = (data || []).map((reg: Record<string, unknown>) => {
      const user = (reg.user as Record<string, unknown>) || {};
      // user_kyc_table is nested under user
      const userKycTable = Array.isArray(user.user_kyc_table)
        ? (user.user_kyc_table[0] as Record<string, unknown>)
        : (user.user_kyc_table as Record<string, unknown> | undefined) || {};
      const location = (reg.mailroom_location as Record<string, unknown>) || {};
      const plan = (reg.mailroom_plan as Record<string, unknown>) || {};

      const firstName = userKycTable.user_kyc_first_name as string;
      const lastName = userKycTable.user_kyc_last_name as string;
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ") ||
        (location.mailroom_location_name as string) ||
        "Unknown";

      return {
        id: reg.mailroom_registration_id,
        full_name: fullName,
        email: (user.users_email as string) || "",
        mobile: (user.mobile_number as string) || null,
        mailroom_code: (reg.mailroom_registration_code as string) || null,
        mailroom_plans: plan.mailroom_plan_name
          ? {
              name: plan.mailroom_plan_name,
              can_receive_mail: plan.mailroom_plan_can_receive_mail || false,
              can_receive_parcels:
                plan.mailroom_plan_can_receive_parcels || false,
            }
          : undefined,
      };
    });

    // Apply client-side search filter if query provided (temporary until RPC function)
    let filtered = registrations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = registrations.filter(
        (r: {
          email: string;
          full_name: string;
          mailroom_code: string | null;
        }) =>
          r.email.toLowerCase().includes(q) ||
          r.full_name.toLowerCase().includes(q) ||
          (r.mailroom_code && r.mailroom_code.toLowerCase().includes(q)),
      );
    }

    return NextResponse.json({ data: filtered });
  } catch (err: unknown) {
    console.error("Search registrations error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
