import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminGenerateLockers } from "@/app/actions/post";

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
      return NextResponse.json(
        { error: "Missing location_id" },
        { status: 400 },
      );
    }

    const data = await adminGenerateLockers({
      locationId,
      total,
    });

    return NextResponse.json(
      {
        message: "Lockers generated",
        data,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.generate.POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
