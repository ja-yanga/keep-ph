import { getAdminRewardClaims } from "@/app/actions/get";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const claims = await getAdminRewardClaims();
    const response = NextResponse.json(claims);
    // Prevent caching of admin data for security
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
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
