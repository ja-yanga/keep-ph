import { NextRequest, NextResponse } from "next/server";
import { addReferral } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      (!body.user_id && !body.referral_code) ||
      !body.referred_email ||
      !body.service_type
    ) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const result = await addReferral({
      userId: body.user_id,
      referralCode: body.referral_code,
      referredEmail: body.referred_email,
      serviceType: body.service_type,
    });

    if (!result.success) {
      return NextResponse.json({ message: result.message });
    }

    return NextResponse.json({ message: result.message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Referral API Error:", message);
    void logApiError(req, { status: 500, message, error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
