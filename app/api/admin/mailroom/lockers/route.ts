import { NextResponse } from "next/server";
import { adminGetMailroomLockers } from "@/app/actions/get";
import { adminCreateMailroomLocker } from "@/app/actions/post";

/**
 * Handle GET requests to list all mailroom lockers.
 */
export async function GET() {
  try {
    const data = await adminGetMailroomLockers();
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.GET:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Handle POST requests to create a new mailroom locker.
 */
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = String(body.location_id ?? "").trim();
    const lockerCode = String(body.locker_code ?? "").trim();
    const isAvailable =
      body.is_available == null ? true : Boolean(body.is_available);

    if (!locationId || !lockerCode) {
      return NextResponse.json(
        { error: "location_id and locker_code are required" },
        { status: 400 },
      );
    }

    const result = await adminCreateMailroomLocker({
      location_id: locationId,
      locker_code: lockerCode,
      is_available: isAvailable,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.POST:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
