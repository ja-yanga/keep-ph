import { NextResponse } from "next/server";
import { validateReferralCode } from "@/app/actions/post";

export async function POST(req: Request) {
  try {
    const { code, currentUserId } = await req.json();

    if (!code) {
      return NextResponse.json({ valid: false, message: "Code is required" });
    }

    const result = await validateReferralCode({
      code,
      currentUserId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("referrals.validate error:", message);
    return NextResponse.json(
      { valid: false, message: "Server error" },
      { status: 500 },
    );
  }
}
