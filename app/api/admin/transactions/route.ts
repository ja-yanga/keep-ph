import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getTransactions, getUserRole } from "@/app/actions/get";

/**
 * GET /api/admin/transactions
 *
 * Fetches payment transactions for admin view.
 * Supports pagination, sorting, search, and optional user filtering.
 *
 * Query parameters:
 * - userIds: Comma-separated list of user IDs to filter by (optional, if not provided returns all)
 * - search: Search query (searches in reference_id, reference, order_id)
 * - sortBy: Sort field (payment_transaction_date, payment_transaction_created_at, payment_transaction_updated_at)
 * - sortDir: Sort direction (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const isAPI = true;
    const { user } = await getAuthenticatedUser(isAPI);

    // Verify requester is admin
    const requesterRole = await getUserRole(user.id);
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const userIdsParam = searchParams.get("userIds");
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") as
      | "payment_transaction_date"
      | "payment_transaction_created_at"
      | "payment_transaction_updated_at"
      | null;
    const sortDir = searchParams.get("sortDir") as "asc" | "desc" | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Parse userIds if provided (comma-separated)
    let userIds: string[] | null = null;
    if (userIdsParam) {
      userIds = userIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    // Validate and sanitize inputs
    const validSortBy =
      sortBy &&
      [
        "payment_transaction_date",
        "payment_transaction_created_at",
        "payment_transaction_updated_at",
      ].includes(sortBy)
        ? sortBy
        : "payment_transaction_date";
    const validSortDir =
      sortDir && ["asc", "desc"].includes(sortDir) ? sortDir : "desc";
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page

    // Fetch transactions (all if userIds is null, filtered if provided)
    const { transactions, pagination, stats } = await getTransactions({
      userIds: userIds && userIds.length > 0 ? userIds : null, // null = all transactions
      search: search || null,
      sortBy: validSortBy,
      sortDir: validSortDir,
      page: validPage,
      limit: validLimit,
      include_user_details: true,
    });

    return NextResponse.json(
      {
        data: transactions,
        meta: {
          pagination,
          stats,
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
    console.error("admin transactions route error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
