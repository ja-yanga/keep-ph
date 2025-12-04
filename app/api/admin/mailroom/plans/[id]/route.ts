import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const {
      name,
      price,
      description,
      storage_limit,
      can_receive_mail,
      can_receive_parcels,
      can_digitize,
    } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = Number(price);
    if (description !== undefined) updates.description = description || null;

    // storage_limit is expected in MB on the DB; client sends GB converted to MB already,
    // but accept numbers/null as provided.
    if (storage_limit !== undefined) {
      updates.storage_limit =
        storage_limit === null ? null : Number(storage_limit);
    }

    // Accept boolean capability fields
    if (can_receive_mail !== undefined)
      updates.can_receive_mail = Boolean(can_receive_mail);
    if (can_receive_parcels !== undefined)
      updates.can_receive_parcels = Boolean(can_receive_parcels);
    if (can_digitize !== undefined)
      updates.can_digitize = Boolean(can_digitize);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // Update the plan
    const { data, error } = await supabaseAdmin
      .from("mailroom_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Plan updated", data },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "Unexpected error in PATCH /api/admin/mailroom/plans/[id]:",
      err
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
