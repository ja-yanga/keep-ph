import { NextResponse } from "next/server";
import { requestRewardClaim } from "@/app/actions/post";

export async function POST(request: Request) {
  try {
    const { userId, paymentMethod, accountDetails } = await request.json();
    if (!userId || !paymentMethod || !accountDetails) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const payload = await requestRewardClaim({
      userId,
      paymentMethod,
      accountDetails,
    });

    if (!payload?.ok) {
      const status = payload?.status ?? 400;
      const message = payload?.error ?? "Unable to submit claim";
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ ok: true, claim: payload.claim });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("rewards.claim:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 },
    );
  }
}
