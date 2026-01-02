import { NextResponse } from "next/server";
import { adminListMailroomPlans } from "@/app/actions/get";

// GET all plans
export async function GET() {
  try {
    const plans = await adminListMailroomPlans();

    const normalized = plans.map((plan) => ({
      id: String(plan.mailroom_plan_id),
      name: String(plan.mailroom_plan_name),
      price: Number(plan.mailroom_plan_price),
      description: plan.mailroom_plan_description ?? null,
      storage_limit:
        plan.mailroom_plan_storage_limit == null
          ? null
          : Number(plan.mailroom_plan_storage_limit),
      can_receive_mail: Boolean(plan.mailroom_plan_can_receive_mail),
      can_receive_parcels: Boolean(plan.mailroom_plan_can_receive_parcels),
      can_digitize: Boolean(plan.mailroom_plan_can_digitize),
    }));

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("admin.mailroom.plans.GET:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
