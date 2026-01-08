import { NextResponse } from "next/server";
import { adminUpdateMailroomLocation } from "@/app/actions/update";

/**
 * Handle PATCH requests to update a mailroom location.
 * Delegates logic to the adminUpdateMailroomLocation server action.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const resolvedParams = await params;
    let id = resolvedParams?.id ?? (body.id ? String(body.id) : undefined);

    if (!id) {
      try {
        const parsed = new URL(req.url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const idx = parts.lastIndexOf("locations");
        if (idx >= 0 && parts.length > idx + 1) {
          id = parts[idx + 1];
        } else {
          id = parts[parts.length - 1];
        }
      } catch {
        // ignore url errors
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    // Extract fields from body
    const args: {
      id: string;
      name?: string;
      code?: string | null;
      region?: string | null;
      city?: string | null;
      barangay?: string | null;
      zip?: string | null;
      total_lockers?: number;
    } = { id };
    if (body.name !== undefined) args.name = String(body.name);
    if (Object.prototype.hasOwnProperty.call(body, "code"))
      args.code = body.code ? String(body.code) : null;
    if (Object.prototype.hasOwnProperty.call(body, "region"))
      args.region = body.region ? String(body.region) : null;
    if (Object.prototype.hasOwnProperty.call(body, "city"))
      args.city = body.city ? String(body.city) : null;
    if (Object.prototype.hasOwnProperty.call(body, "barangay"))
      args.barangay = body.barangay ? String(body.barangay) : null;
    if (Object.prototype.hasOwnProperty.call(body, "zip"))
      args.zip = body.zip ? String(body.zip) : null;
    if (body.total_lockers !== undefined) {
      const n = Number(body.total_lockers);
      args.total_lockers = Number.isNaN(n) ? 0 : n;
    }

    if (Object.keys(args).length === 1) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    // Call the server action
    const result = await adminUpdateMailroomLocation(args);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("[Locations API PATCH Error]:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
