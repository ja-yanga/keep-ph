//TODO: convert to server component

import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// server-side supabase client
const supabase = createSupabaseServiceClient();

import type { MailroomPlan } from "@/utils/types/types";

type MailroomPlanTableRow = {
  mailroom_plan_id: string;
  mailroom_plan_name: string;
  mailroom_plan_price: number;
  mailroom_plan_description: string | null;
  mailroom_plan_storage_limit: number | null;
  mailroom_plan_can_receive_mail: boolean;
  mailroom_plan_can_receive_parcels: boolean;
  mailroom_plan_can_digitize: boolean;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("mailroom_plan_table")
      .select("*")
      .order("mailroom_plan_price", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    const formattedPlans: MailroomPlan[] =
      data?.map((plan: MailroomPlanTableRow) => ({
        id: plan.mailroom_plan_id,
        name: plan.mailroom_plan_name,
        price: Number(plan.mailroom_plan_price),
        description: plan.mailroom_plan_description,
        storageLimit: plan.mailroom_plan_storage_limit,
        canReceiveMail: plan.mailroom_plan_can_receive_mail,
        canReceiveParcels: plan.mailroom_plan_can_receive_parcels,
        canDigitize: plan.mailroom_plan_can_digitize,
      })) ?? [];

    return NextResponse.json(formattedPlans);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
