import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServiceClient();

    // set subscription_auto_renew = false on subscription_table for the registration
    const { error } = await supabase
      .from("subscription_table")
      .update({ subscription_auto_renew: false })
      .eq("mailroom_registration_id", id);

    if (error) {
      console.error("cancel subscription error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to cancel" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("cancel route unexpected error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
