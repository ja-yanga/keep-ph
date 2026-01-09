import { createClient } from "@/lib/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { getUserStorageFiles } from "@/app/actions/get";

export async function GET(request: NextRequest) {
  try {
    // authenticate user
    const supabase = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") as
      | "uploaded_at"
      | "file_name"
      | "file_size_mb"
      | null;
    const sortDir = searchParams.get("sortDir") as "asc" | "desc" | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate and sanitize inputs
    const validSortBy =
      sortBy && ["uploaded_at", "file_name", "file_size_mb"].includes(sortBy)
        ? sortBy
        : "uploaded_at";
    const validSortDir =
      sortDir && ["asc", "desc"].includes(sortDir) ? sortDir : "desc";
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page

    const data = await getUserStorageFiles(user.id, {
      search,
      sortBy: validSortBy,
      sortDir: validSortDir,
      page: validPage,
      limit: validLimit,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("user storage error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
