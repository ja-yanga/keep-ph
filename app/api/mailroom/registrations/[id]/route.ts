import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Registration fetch error:", error);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // 2. Fetch Assigned Lockers
    const { data: assignedLockers } = await supabase
      .from("mailroom_assigned_lockers")
      .select(
        `
        *,
        locker:location_lockers (*)
      `
      )
      .eq("registration_id", id);

    // 3. Format the response
    const lockers =
      assignedLockers?.map((a: any) => a.locker).filter(Boolean) || [];

    const responseData = {
      ...registration,
      lockers,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
