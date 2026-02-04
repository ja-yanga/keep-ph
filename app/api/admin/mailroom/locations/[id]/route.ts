import { NextResponse } from "next/server";
import { adminUpdateMailroomLocation } from "@/app/actions/update";
import { logApiError } from "@/lib/error-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (parseErr) {
      void parseErr;
      void logApiError(req, { status: 400, message: "Invalid JSON body" });
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
      } catch (urlErr) {
        void urlErr;
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    const normalized = await adminUpdateMailroomLocation({ id, body });

    return NextResponse.json(
      { message: "Location updated", data: normalized },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    void logApiError(req, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
