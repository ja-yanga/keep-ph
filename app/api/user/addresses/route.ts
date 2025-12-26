import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAddresses } from "@/app/actions/get";
import { createUserAddress } from "@/app/actions/post";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await getUserAddresses(user.id);
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
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { label, line1, line2, city, region, postal, is_default } = body;

    if (!line1)
      return NextResponse.json({ error: "line1 required" }, { status: 400 });

    const data = await createUserAddress({
      user_id: user.id,
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
