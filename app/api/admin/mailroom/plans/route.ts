import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

// GET all plans
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("mailroom_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
