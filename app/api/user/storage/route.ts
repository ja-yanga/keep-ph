import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserStorageFiles } from "@/app/actions/get";

export async function GET() {
  try {
    // authenticate user
    const supabase = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await getUserStorageFiles(user.id);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("user storage error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
