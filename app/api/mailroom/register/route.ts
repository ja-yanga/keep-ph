import { NextResponse } from "next/server";
import {
  calculateRegistrationAmount,
  checkLockerAvailability,
} from "@/app/actions/get";
import { createMailroomRegistration } from "@/app/actions/post";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, locationId, planId, lockerQty, months, referralCode } =
      body;

    // 1. Validation
    if (!userId || !locationId || !planId || !lockerQty || !months) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 2. Check Locker Availability
    const availability = await checkLockerAvailability({
      locationId,
      lockerQty,
    });

    if (!availability.available) {
      return NextResponse.json(
        {
          error: `Insufficient lockers available. Requested: ${lockerQty}, Available: ${availability.count}`,
        },
        { status: 400 },
      );
    }

    // 3. Calculate Amount Due
    const amountDue = await calculateRegistrationAmount({
      planId,
      lockerQty,
      months,
      referralCode,
    });

    // 4. Create Registration
    const { registration } = await createMailroomRegistration({
      userId,
      locationId,
      planId,
      lockerQty,
    });

    return NextResponse.json({
      message: "Mailroom registered successfully",
      data: registration,
      amountDue,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error creating mailroom registration:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
