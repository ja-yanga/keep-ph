import { NextResponse } from "next/server";
import { getMailroomPlans } from "@/app/actions/get";
import type { MailroomPlan } from "@/utils/types";

export async function GET() {
  try {
    const plans = await getMailroomPlans();

    // Transform to match MailroomPlan type
    const formattedPlans: MailroomPlan[] = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      description: plan.description,
      storageLimit: plan.storage_limit,
      canReceiveMail: plan.can_receive_mail,
      canReceiveParcels: plan.can_receive_parcels,
      canDigitize: plan.can_digitize,
    }));

    return NextResponse.json(formattedPlans);
  } catch (error) {
    console.error("Unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
