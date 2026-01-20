import { getAdminRewardClaims } from "@/app/actions/get";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const claims = await getAdminRewardClaims();
    const response = NextResponse.json(claims);
    // Allow short private caching to improve performance while maintaining security
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin.rewards.list:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
