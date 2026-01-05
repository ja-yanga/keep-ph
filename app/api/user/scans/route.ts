import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScans } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "Registration ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scans, usage } = await getUserScans(registrationId, user.id);
    return NextResponse.json({ scans, usage });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
