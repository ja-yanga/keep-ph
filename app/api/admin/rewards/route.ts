import { getAdminRewardClaims } from "@/app/actions/get";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const claims = await getAdminRewardClaims();
    return NextResponse.json(claims);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin.rewards.list:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
