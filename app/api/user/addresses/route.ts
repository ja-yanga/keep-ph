import { NextResponse } from "next/server";
import { getUserAddresses } from "@/app/actions/get";
import { createUserAddress } from "@/app/actions/post";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const data = await getUserAddresses(userId);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error("user.addresses.GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, label, line1, line2, city, region, postal, is_default } =
      body;

    if (!user_id || !line1)
      return NextResponse.json(
        { error: "user_id and line1 required" },
        { status: 400 },
      );

    const data = await createUserAddress({
      user_id,
      label,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error("user.addresses.POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
