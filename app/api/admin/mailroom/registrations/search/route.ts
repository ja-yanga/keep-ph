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
        // If RPC function doesn't exist or has any error, fallback to PostgREST query
        console.warn(
          "RPC function error, using fallback query:",
          error.code,
          error.message,
        );
        // Fall through to fallback query below
      } else {
        // Parse RPC response
        try {
          const parsed =
            typeof data === "string" ? JSON.parse(data) : (data as unknown);
          registrations = Array.isArray(parsed) ? parsed : [];
          return NextResponse.json({ data: registrations });
        } catch (parseError) {
          console.error("Failed to parse RPC response:", parseError);
          // Fall through to fallback query below
        }
      }
    } catch (rpcError) {
      // If RPC fails for any reason, use fallback PostgREST query
      console.warn("RPC call failed, using fallback query:", rpcError);
    }

    // Fallback: Use PostgREST query with better search
    // Search by email, registration code, and name at database level
    // Since PostgREST doesn't easily support OR across joined tables,
    // we'll search by email first (find matching users), then by registration code
    const searchPattern = `%${searchQuery}%`;
    const fetchLimit =
      searchQuery && searchQuery.length >= 2
        ? Math.min(limit * 10, 5000) // Fetch more when searching (up to 5k)
        : limit;

    // Strategy: Make two queries and combine results
    // 1. Search registrations by registration code
    // 2. Search users by email, then get their registrations
    // Then combine and deduplicate

    let allRegistrations: unknown[] = [];
    const seenIds = new Set<string>();

    // Query 1: Search by registration code
    if (searchQuery && searchQuery.length >= 2) {
      const codeQuery = supabaseAdmin
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
        .ilike("mailroom_registration_code", searchPattern)
        .limit(fetchLimit)
        .order("mailroom_registration_created_at", { ascending: false });

      const { data: codeData, error: codeError } = await codeQuery;

      if (!codeError && codeData) {
        allRegistrations.push(...codeData);
        codeData.forEach((reg: Record<string, unknown>) => {
          seenIds.add(String(reg.mailroom_registration_id));
        });
      }
    }

    // Query 2: Search users by email, then get their registrations
    if (searchQuery && searchQuery.length >= 2) {
      // First, find users matching the email
      const { data: matchingUsers, error: usersError } = await supabaseAdmin
        .from("users_table")
        .select("users_id")
        .ilike("users_email", searchPattern)
        .limit(100); // Limit to 100 matching users to avoid too many results

      if (!usersError && matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map(
          (u: Record<string, unknown>) => u.users_id,
        );

        // Get registrations for these users
        const emailQuery = supabaseAdmin
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
          .in("user_id", userIds)
          .limit(fetchLimit)
          .order("mailroom_registration_created_at", { ascending: false });

        const { data: emailData, error: emailError } = await emailQuery;

        if (!emailError && emailData) {
          // Add only new registrations (deduplicate)
          emailData.forEach((reg: Record<string, unknown>) => {
            const regId = String(reg.mailroom_registration_id);
            if (!seenIds.has(regId)) {
              allRegistrations.push(reg);
              seenIds.add(regId);
            }
          });
        }
      }
    }

    // If no search query or no results from search, get all registrations
    if (
      (!searchQuery || searchQuery.length < 2) &&
      allRegistrations.length === 0
    ) {
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
        .limit(fetchLimit)
        .order("mailroom_registration_created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Search registrations PostgREST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      allRegistrations = data || [];
    }

    const data = allRegistrations;

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

    // Apply additional client-side filtering for name (since we already filtered by email and code at DB level)
    // This ensures we catch name matches that might have been missed
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
      // Sort by relevance (email matches first, then code, then name)
      registrations.sort((a, b) => {
        const aReg = a as {
          email: string;
          full_name: string;
          mailroom_code: string | null;
        };
        const bReg = b as {
          email: string;
          full_name: string;
          mailroom_code: string | null;
        };
        const aEmailMatch = aReg.email?.toLowerCase().includes(q) ? 0 : 1;
        const bEmailMatch = bReg.email?.toLowerCase().includes(q) ? 0 : 1;
        if (aEmailMatch !== bEmailMatch) return aEmailMatch - bEmailMatch;
        const aCodeMatch = aReg.mailroom_code?.toLowerCase().includes(q)
          ? 0
          : 1;
        const bCodeMatch = bReg.mailroom_code?.toLowerCase().includes(q)
          ? 0
          : 1;
        if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
        return 0;
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
