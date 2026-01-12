import { NextResponse } from "next/server";
import { getDashboardContent } from "@/app/actions/get";

export async function GET() {
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
