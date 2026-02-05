import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateLocker } from "@/app/actions/update";
import { adminDeleteLocker } from "@/app/actions/delete";
import { logApiError } from "@/lib/error-log";

const parseBool = (val: unknown): boolean | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return undefined;
};

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
    const isAssignable =
      has("is_assignable") && body.is_assignable != null
        ? parseBool(body.is_assignable)
        : undefined;

    if (
      lockerCode === undefined &&
      isAvailable === undefined &&
      locationId === undefined &&
      assignmentStatus === undefined &&
      isAssignable === undefined
    ) {
      void logApiError(req, {
        status: 400,
        message: "No updatable fields provided",
      });
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const data = await adminUpdateLocker({
      id,
      lockerCode,
      isAvailable,
      locationId,
      assignmentStatus,
      isAssignable,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.[id].PUT:", err);
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

export async function DELETE(
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
      void logApiError(req, { status: 400, message: "Missing id" });
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await adminDeleteLocker({ id });

    return NextResponse.json({ message: "Locker deleted" }, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.[id].DELETE:", err);
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
