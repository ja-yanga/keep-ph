import { NextResponse } from "next/server";
import { claimReferralRewards } from "@/app/actions/post";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

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
      const msg = payload?.message ?? "Unable to submit claim";
      void logApiError(req, { status: 400, message: msg });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Log the reward claim activity
    await logActivity({
      userId,
      action: "CLAIM",
      type: "USER_REQUEST_REWARD",
      entityType: "REWARDS_CLAIM",
      details: {
        payment_amount: payload.payout,
        payment_method: paymentMethod,
      },
    });

    return NextResponse.json({
      ok: true,
      message: payload.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("rewards.claim:", message);
    void logApiError(req, {
      status: 500,
      message: message || "Server error",
      error: err,
    });
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
