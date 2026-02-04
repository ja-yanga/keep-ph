import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateLocker } from "@/app/actions/update";
import { adminDeleteLocker } from "@/app/actions/delete";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    const lockerCode =
      has("locker_code") && body.locker_code != null
        ? String(body.locker_code)
        : undefined;
    const isAvailable =
      has("is_available") && body.is_available != null
        ? Boolean(body.is_available)
        : undefined;
    const locationId =
      has("location_id") && body.location_id != null
        ? String(body.location_id)
        : undefined;
    const assignmentStatus =
      has("assignment_status") && body.assignment_status != null
        ? String(body.assignment_status)
        : undefined;

    const data = await adminUpdateLocker({
      id,
      lockerCode,
      isAvailable,
      locationId,
      assignmentStatus,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.[id].PUT:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await adminDeleteLocker({ id });

    return NextResponse.json({ message: "Locker deleted" }, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.[id].DELETE:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
