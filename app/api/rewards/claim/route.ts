import { NextResponse } from "next/server";
import { claimReferralRewards } from "@/app/actions/post";

export async function POST(req: Request) {
  try {
    const { userId, paymentMethod, accountDetails } = await req.json();
    if (!userId || !paymentMethod || !accountDetails) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const payload = await claimReferralRewards(
      userId,
      paymentMethod,
      accountDetails,
    );

    if (!payload?.success) {
      return NextResponse.json(
        { error: payload?.message ?? "Unable to submit claim" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: payload.message,
      payout: payload.payout,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("rewards.claim:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
