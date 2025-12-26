import { NextResponse } from "next/server";
import { getRewardStatus } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const status = await getRewardStatus(userId);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("rewards.status error:", {
      message,
      stack,
      error: err,
    });
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
