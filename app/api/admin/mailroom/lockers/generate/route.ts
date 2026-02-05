import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminGenerateLockers } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const serviceSupabase = createSupabaseServiceClient();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = body.location_id ? String(body.location_id) : "";
    const total = Number(body.total ?? 0);

    if (!locationId) {
      void logApiError(req, { status: 400, message: "Missing location_id" });
      return NextResponse.json(
        { error: "Missing location_id" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(total) || total <= 0) {
      return NextResponse.json(
        { error: "Invalid total; must be a positive integer" },
        { status: 400 },
      );
    }

    const data = await adminGenerateLockers({
      locationId,
      total,
    });

    // Update location total_lockers (best-effort)
    // We use serviceSupabase to bypass RLS for internal count update
    const { error: updErr } = await serviceSupabase
      .from("mailroom_location_table")
      .update({ mailroom_location_total_lockers: data.total_lockers })
      .eq("mailroom_location_id", locationId);

    if (updErr) {
      void logApiError(req, {
        status: 500,
        message: "Created lockers but failed to update location total",
        error: updErr,
      });
      return NextResponse.json(
        { error: "Created lockers but failed to update location total" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Lockers generated",
        data,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.generate.POST:", err);
    void logApiError(req, {
      status: 500,
      message: "Internal Server Error",
      error: err,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
