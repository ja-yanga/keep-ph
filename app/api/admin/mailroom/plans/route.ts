import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET all plans
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("mailroom_plan_table")
      .select(
        "mailroom_plan_id, mailroom_plan_name, mailroom_plan_price, mailroom_plan_description, mailroom_plan_storage_limit, mailroom_plan_can_receive_mail, mailroom_plan_can_receive_parcels, mailroom_plan_can_digitize",
      )
      .order("mailroom_plan_price", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const normalized = rows.map((r) => ({
      id: String(r.mailroom_plan_id),
      name: String(r.mailroom_plan_name),
      price: Number(r.mailroom_plan_price),
      description: r.mailroom_plan_description ?? null,
      storage_limit:
        r.mailroom_plan_storage_limit == null
          ? null
          : Number(r.mailroom_plan_storage_limit),
      can_receive_mail: Boolean(r.mailroom_plan_can_receive_mail),
      can_receive_parcels: Boolean(r.mailroom_plan_can_receive_parcels),
      can_digitize: Boolean(r.mailroom_plan_can_digitize),
    }));

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
