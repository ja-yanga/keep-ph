import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMailroomRegistrationsWithStats } from "@/app/actions/get";

export async function GET() {
  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const isAPI = true;
    const { user } = await getAuthenticatedUser(isAPI);

    const { data: registrations, stats: totals } =
      await getMailroomRegistrationsWithStats(user.id);

    return NextResponse.json(
      {
        data: registrations,
        meta: {
          total: registrations.length,
          page: 1,
          limit: registrations.length,
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
