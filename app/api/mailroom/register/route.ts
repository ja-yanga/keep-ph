import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use Service Role Key to bypass RLS policies for the insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      full_name,
      email,
      mobile,
      telephone,
      locationId,
      planId,
      lockerQty,
      months,
      notes,
      // NEW: Accept referral code from body (make sure to update frontend payload too!)
      referralCode,
    } = body;

    // 1. Validation
    if (!userId || !locationId || !planId || !lockerQty || !months) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Fetch Plan Price (Server-Side Source of Truth)
    const { data: plan, error: planError } = await supabaseAdmin
      .from("mailroom_plans")
      .select("price")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // 3. Calculate Amount Due
    let amountDue = Number(plan.price) * Number(lockerQty) * Number(months);

    // 4. Apply Annual Discount (20%)
    if (Number(months) === 12) {
      amountDue = amountDue * 0.8;
    }

    // NEW: 4.5 Apply Referral Discount (5%)
    // We must validate the code again server-side to prevent manipulation
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      // Only apply if valid and not self-referral
      if (referrer && referrer.id !== userId) {
        amountDue = amountDue * 0.95; // 5% off
      }
    }

    // 5. Generate Unique Mailroom Code
    let mailroomCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      // Generate random 4-char alphanumeric string (substring 2 to 6)
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      mailroomCode = `KPH-${randomStr}`;

      // Check if exists
      const { data: existing } = await supabaseAdmin
        .from("mailroom_registrations")
        .select("id")
        .eq("mailroom_code", mailroomCode)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique mailroom code" },
        { status: 500 }
      );
    }

    // 6. Prepare Data for Insert
    // Handle optional numeric fields: convert empty strings to null
    const mobileNum = mobile ? mobile.replace(/\D/g, "") : null;
    const telephoneNum = telephone ? telephone.replace(/\D/g, "") : null;

    const { data, error } = await supabaseAdmin
      .from("mailroom_registrations")
      .insert([
        {
          user_id: userId,
          location_id: locationId,
          plan_id: planId,
          locker_qty: lockerQty,
          months,
          notes,
          // Contact Info from Schema
          full_name,
          email,
          mobile: mobileNum,
          telephone: telephoneNum,
          mailroom_code: mailroomCode, // Added back
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Registration Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Mailroom registered successfully",
      data,
      amountDue, // Return calculated amount for payment
    });
  } catch (err: any) {
    console.error("mailroom register unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
