import { NextResponse } from "next/server";
import { getDashboardContent } from "@/app/actions/get";
import { logApiError } from "@/lib/error-log";

export async function GET(req: Request) {
  try {
    const stats = await getDashboardContent();
    return NextResponse.json(stats ?? {}, {
      headers: {
        // Cache for 30 seconds, allow stale-while-revalidate for 60 seconds
        "Cache-Control":
          "private, max-age=30, s-maxage=30, stale-while-revalidate=60",
        // Enable compression
        "Content-Type": "application/json",
        // Optimize connection
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    void logApiError(req, { status: 500, message: errorMessage, error });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
