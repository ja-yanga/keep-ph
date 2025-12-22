import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const supabase = createSupabaseServiceClient();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // We only toggle auto_renew to false. We don't delete the row.
    const { error } = await supabase
      .from("mailroom_registrations")
      .update({ auto_renew: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
