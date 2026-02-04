import { NextRequest, NextResponse } from "next/server";
import { adminGetArchivedPackages } from "@/app/actions/get";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "deleted_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const data = await adminGetArchivedPackages({
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in GET /api/admin/mailroom/archive:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
