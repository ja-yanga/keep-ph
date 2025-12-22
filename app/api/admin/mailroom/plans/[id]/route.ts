import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    const body = (await req
      .json()
      .catch(() => ({}) as Record<string, unknown>)) as
      | Record<string, unknown>
      | undefined;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      updates.mailroom_plan_name = String(body.name ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(body, "price")) {
      updates.mailroom_plan_price = Number(body.price ?? 0);
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      updates.mailroom_plan_description =
        body.description == null ? null : String(body.description);
    }
    if (Object.prototype.hasOwnProperty.call(body, "storage_limit")) {
      updates.mailroom_plan_storage_limit =
        body.storage_limit == null ? null : Number(body.storage_limit);
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_receive_mail")) {
      updates.mailroom_plan_can_receive_mail = Boolean(body.can_receive_mail);
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_receive_parcels")) {
      updates.mailroom_plan_can_receive_parcels = Boolean(
        body.can_receive_parcels,
      );
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_digitize")) {
      updates.mailroom_plan_can_digitize = Boolean(body.can_digitize);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mailroom_plan_table")
      .update(updates)
      .eq("mailroom_plan_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as Record<string, unknown> | null;

    const normalized =
      row == null
        ? null
        : {
            id: String(row.mailroom_plan_id ?? ""),
            name: String(row.mailroom_plan_name ?? ""),
            price: Number(row.mailroom_plan_price ?? 0),
            description: row.mailroom_plan_description ?? null,
            storage_limit:
              row.mailroom_plan_storage_limit == null
                ? null
                : Number(row.mailroom_plan_storage_limit),
            can_receive_mail: Boolean(row.mailroom_plan_can_receive_mail),
            can_receive_parcels: Boolean(row.mailroom_plan_can_receive_parcels),
            can_digitize: Boolean(row.mailroom_plan_can_digitize),
          };

    return NextResponse.json(
      { message: "Plan updated", data: normalized },
      { status: 200 },
    );
  } catch (err: unknown) {
    void err;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
