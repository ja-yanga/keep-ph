import { getAuthenticatedUser } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Await params to ensure we get the ID correctly in Next.js 15+
  const { id } = await params;

  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const { user, supabase } = await getAuthenticatedUser(true);

    // 1. Fetch Registration with relations
    // Using the user's supabase client ensures RLS is applied.
    // Assuming the table name is 'mailroom_registration_table' based on the plural route.
    const { data: registration, error } = await supabase
      .from("mailroom_registration_table")
      .select(
        `
        *,
        mailroom_plan_table (*),
        mailroom_location_table (*),
        users_table (*),
        mailbox_item_table (*)
      `,
      )
      .eq("mailroom_registration_id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Registration fetch error:", error);
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 },
      );
    }

    // 2. Fetch Assigned Lockers
    // We might need the service role client if RLS is too restrictive for this join,
    // but better to keep it secure first.
    const { data: assignedLockers } = await supabase
      .from("mailroom_assigned_locker_table")
      .select(
        `
        *,
        location_locker_table (*)
      `,
      )
      .eq("mailroom_registration_id", id);

    // 3. Format the response
    const lockers =
      assignedLockers
        ?.map((a) => {
          const locker = a.location_locker_table;
          if (!locker) return null;
          return {
            ...(locker as Record<string, unknown>),
            status: (a as Record<string, unknown>)
              .mailroom_assigned_locker_status,
          };
        })
        .filter(Boolean) || [];

    const responseData = {
      ...registration,
      lockers,
    };

    return NextResponse.json({ data: responseData });
  } catch (err: unknown) {
    // Handle authentication errors with proper 401 response
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("API Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
