import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMailroomRegistrationsWithStats } from "@/app/actions/get";

export async function GET(request: NextRequest) {
  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const isAPI = true;
    const { user } = await getAuthenticatedUser(isAPI);

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const input_page = parseInt(searchParams.get("page") || "1", 10);
    const input_limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate and sanitize inputs

    const validPage = Math.max(1, input_page);
    const validLimit = Math.min(Math.max(1, input_limit), 100); // Max 100 items per page\

    const {
      data: registrations,
      stats: totals,
      pagination,
    } = await getMailroomRegistrationsWithStats(user.id, {
      search,
      page: validPage,
      limit: validLimit,
    });

    return NextResponse.json(
      {
        data: registrations,
        meta: {
          pagination,
          stats: totals ?? null,
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
