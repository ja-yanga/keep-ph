// /app/api/mailroom/register/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      firstName,
      lastName,
      email,
      mobile,
      locationId,
      planId,
      lockerQty,
      months,
      notes,
    } = body;

    const { data, error } = await supabase
      .from("mailroom_registrations")
      .insert([
        {
          user_id: userId,
          location_id: locationId,
          plan_id: planId,
          locker_qty: lockerQty,
          months,
          notes,
        },
      ]);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      message: "Mailroom registered successfully",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
