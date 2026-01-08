import { NextResponse } from "next/server";
import { adminUpdateMailroomLocker } from "@/app/actions/update";
import { adminDeleteMailroomLocker } from "@/app/actions/delete";

/**
 * Handle PUT requests to update a mailroom locker.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    const args: {
      id: string;
      locker_code?: string;
      is_available?: boolean;
      location_id?: string;
    } = { id };

    if (has("locker_code") && body.locker_code != null)
      args.locker_code = String(body.locker_code);
    if (has("is_available") && body.is_available != null)
      args.is_available = Boolean(body.is_available);
    if (has("location_id") && body.location_id != null)
      args.location_id = String(body.location_id);

    if (Object.keys(args).length === 1) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const result = await adminUpdateMailroomLocker(args);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.PUT:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Handle DELETE requests to soft delete a mailroom locker.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await adminDeleteMailroomLocker(id);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.DELETE:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
