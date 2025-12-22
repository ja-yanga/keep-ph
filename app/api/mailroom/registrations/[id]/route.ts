import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const supabase = createSupabaseServiceClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Await params to ensure we get the ID correctly in Next.js 15+
  const { id } = await params;

  try {
    // 1. Fetch Registration with relations
    const { data: registration, error } = await supabase
      .from("mailroom_registrations")
      .select(
        `
        *,
        mailroom_plans (*),
        mailroom_locations (*),
        users (*),
        packages:mailroom_packages (*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Registration fetch error:", error);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // 2. Fetch Assigned Lockers
    const { data: assignedLockers } = await supabase
      .from("mailroom_assigned_lockers")
      .select(
        `
        *,
        locker:location_lockers (*)
      `,
      )
      .eq("registration_id", id);

    // 3. Format the response
    // Update: Merge the assignment status into the locker object
    const lockers =
      assignedLockers
        ?.map((a: { locker?: unknown; status?: string }) => {
          if (!a.locker) return null;
          return {
            ...(a.locker as Record<string, unknown>),
            status: a.status, // <--- Pass the status from the assignment to the locker object
          };
        })
        .filter(Boolean) || [];

    const responseData = {
      ...registration,
      lockers,
    };

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error("API Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
