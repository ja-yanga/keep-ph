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
      locationId,
      planId,
      lockerQty,
      months,
      notes,
      referralCode,
    } = body;

    // 1. Validation
    if (!userId || !locationId || !planId || !lockerQty || !months) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Fetch Plan Price
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

    // 3. Check Locker Availability BEFORE creating registration
    const { data: availableLockers, error: lockerCheckError } =
      await supabaseAdmin
        .from("location_lockers")
        .select("id")
        .eq("location_id", locationId)
        .eq("is_available", true)
        .limit(lockerQty);

    if (lockerCheckError) {
      return NextResponse.json(
        { error: "Failed to check locker availability" },
        { status: 500 }
      );
    }

    if (!availableLockers || availableLockers.length < lockerQty) {
      return NextResponse.json(
        {
          error: `Insufficient lockers available. Requested: ${lockerQty}, Available: ${
            availableLockers?.length || 0
          }`,
        },
        { status: 400 }
      );
    }

    // 4. Calculate Amount Due
    let amountDue = Number(plan.price) * Number(lockerQty) * Number(months);

    if (Number(months) === 12) {
      amountDue = amountDue * 0.8;
    }

    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      if (referrer && referrer.id !== userId) {
        amountDue = amountDue * 0.95;
      }
    }

    // 5. Generate Unique Mailroom Code
    let mailroomCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      mailroomCode = `KPH-${randomStr}`;

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

    // 6. Insert Registration
    const mobileNum = mobile ? mobile.replace(/\D/g, "") : null;

    const { data: registration, error: regError } = await supabaseAdmin
      .from("mailroom_registrations")
      .insert([
        {
          user_id: userId,
          location_id: locationId,
          plan_id: planId,
          locker_qty: lockerQty,
          months,
          notes,
          full_name,
          email,
          mobile: mobileNum,
          mailroom_code: mailroomCode,
        },
      ])
      .select()
      .single();

    if (regError) {
      console.error("Registration Insert Error:", regError);
      return NextResponse.json({ error: regError.message }, { status: 400 });
    }

    // 7. ASSIGN LOCKERS (Restored Logic)
    const lockerIdsToAssign = availableLockers.map((l) => l.id);

    // 7a. Mark lockers as unavailable
    const { error: updateError } = await supabaseAdmin
      .from("location_lockers")
      .update({ is_available: false })
      .in("id", lockerIdsToAssign);

    if (updateError) {
      console.error("Failed to update locker status:", updateError);
      // Note: In a real production app, you might want to rollback the registration here
    }

    // 7b. Create assignment records
    const assignments = lockerIdsToAssign.map((lockerId) => ({
      registration_id: registration.id,
      locker_id: lockerId,
      status: "Normal",
    }));

    const { error: assignError } = await supabaseAdmin
      .from("mailroom_assigned_lockers")
      .insert(assignments);

    if (assignError) {
      console.error("Failed to assign lockers:", assignError);
    }

    return NextResponse.json({
      message: "Mailroom registered successfully",
      data: registration,
      amountDue,
    });
  } catch (err: any) {
    console.error("mailroom register unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
