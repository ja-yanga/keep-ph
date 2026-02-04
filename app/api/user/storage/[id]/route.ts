import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteUserStorageFile } from "@/app/actions/delete";
import { logApiError } from "@/lib/error-log";

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    let params = context.params as { id: string } | Promise<{ id: string }>;
    if (params instanceof Promise) {
      params = await params;
    }
    let scanId = (params as { id: string })?.id;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!scanId) {
      // fallback: try to derive from URL
      try {
        const parts = new URL(request.url).pathname.split("/").filter(Boolean);
        scanId = parts[parts.length - 1];
      } catch {
        // ignore
      }
    }

    if (!scanId) {
      void logApiError(request, {
        status: 400,
        message: "scan id required",
      });
      return NextResponse.json({ error: "scan id required" }, { status: 400 });
    }

    const data = await deleteUserStorageFile({
      userId: user.id,
      id: scanId,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";

    const statusMap: Record<string, number> = {
      "Scan not found": 404,
      Forbidden: 403,
    };

    const status = statusMap[errorMessage] || 500;
    void logApiError(request, {
      status,
      message: errorMessage,
      error: err,
    });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
