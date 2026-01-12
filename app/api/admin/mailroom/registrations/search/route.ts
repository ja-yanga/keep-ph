import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Search endpoint for mailroom registrations (used in select/autocomplete components)
 * Supports search query parameter for filtering by email, name, or mailroom code
 * Uses RPC function for efficient database-level search
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("q")?.trim() || "";
    // Increase limit significantly for better search coverage
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 500);

    const supabaseAdmin = createSupabaseServiceClient();

    // Early return if search query is less than 2 characters (component requirement)
    if (searchQuery && searchQuery.length > 0 && searchQuery.length < 2) {
      return NextResponse.json({ data: [] });
    }

    // Try to use RPC function for efficient database-level search
    // Fallback to PostgREST query if RPC doesn't exist yet
    let registrations: unknown[] = [];

    try {
      const { data, error } = await supabaseAdmin.rpc(
        "search_mailroom_registrations",
        {
          search_query: searchQuery || "",
          result_limit: limit,
        },
      );

      if (error) {
        // If RPC function doesn't exist (42883), fallback to PostgREST query
        if (
          error.code === "42883" ||
          error.message?.includes("does not exist")
        ) {
          console.warn(
            "RPC function not found, using fallback query:",
            error.message,
          );
          // Fall through to fallback query below
        } else {
          console.error("Search registrations RPC error:", error);
          throw error;
        }
      } else {
        // Parse RPC response
        try {
          const parsed =
            typeof data === "string" ? JSON.parse(data) : (data as unknown);
          registrations = Array.isArray(parsed) ? parsed : [];
          return NextResponse.json({ data: registrations });
        } catch (parseError) {
          console.error("Failed to parse RPC response:", parseError);
          throw new Error("Failed to parse search results");
        }
      }
    } catch (rpcError) {
      // If RPC fails, use fallback PostgREST query
      console.warn("RPC call failed, using fallback query:", rpcError);
    }

    // Fallback: Use PostgREST query with better search
    // For large datasets, we need to fetch more records to ensure we find matches
    const fetchLimit =
      searchQuery && searchQuery.length >= 2
        ? Math.min(limit * 50, 10000) // Fetch significantly more when searching (up to 10k)
        : limit;

    // Build query - we'll search by registration code at DB level
    // and filter by email/name client-side from a larger set
    let query = supabaseAdmin
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
      .limit(fetchLimit)
      .order("mailroom_registration_created_at", { ascending: false });

    // Apply search filter on registration code if provided
    // Note: PostgREST can't easily search across joins, so we fetch more and filter client-side
    if (searchQuery && searchQuery.length >= 2) {
      query = query.ilike("mailroom_registration_code", `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Search registrations PostgREST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match component expectations
    registrations = (data || []).map((reg: Record<string, unknown>) => {
      const user = (reg.user as Record<string, unknown>) || {};
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

    // Apply additional client-side filtering for email and name
    if (searchQuery && searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      registrations = registrations.filter((r) => {
        const reg = r as {
          email: string;
          full_name: string;
          mailroom_code: string | null;
        };
        return (
          reg.email?.toLowerCase().includes(q) ||
          reg.full_name?.toLowerCase().includes(q) ||
          (reg.mailroom_code && reg.mailroom_code.toLowerCase().includes(q))
        );
      });
      registrations = registrations.slice(0, limit);
    }

    return NextResponse.json({ data: registrations });
  } catch (err: unknown) {
    console.error("Search registrations error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
