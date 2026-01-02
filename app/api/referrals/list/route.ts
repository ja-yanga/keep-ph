import { NextRequest, NextResponse } from "next/server";
import { listReferrals } from "@/app/actions/post";

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id)
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const result = await listReferrals(user_id);

    return NextResponse.json({ referrals: result.referrals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
