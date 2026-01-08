import { NextResponse } from "next/server";
import { adminGenerateMailroomLockers } from "@/app/actions/post";

/**
 * Handle POST requests to generate sequential mailroom lockers.
 */
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = body.location_id
      ? String(body.location_id).trim()
      : null;
    const totalToAdd = Number(body.total ?? 0);

    if (!locationId) {
      return NextResponse.json(
        { error: "location_id is required" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(totalToAdd) || totalToAdd <= 0) {
      return NextResponse.json(
        { error: "Invalid total; must be a positive integer" },
        { status: 400 },
      );
    }

    const result = await adminGenerateMailroomLockers({
      location_id: locationId,
      total: totalToAdd,
    });

    if (result.ok === false) {
      return NextResponse.json(
        { error: result.error || "Failed to generate lockers" },
        { status: result.error === "Location not found" ? 404 : 500 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.generate.POST:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
