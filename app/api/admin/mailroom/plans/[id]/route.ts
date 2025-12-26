import { NextResponse } from "next/server";
import { adminUpdateMailroomPlan } from "@/app/actions/update";

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
      updates.name = String(body.name ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(body, "price")) {
      updates.price = Number(body.price ?? 0);
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      updates.description =
        body.description == null ? null : String(body.description);
    }
    if (Object.prototype.hasOwnProperty.call(body, "storage_limit")) {
      updates.storage_limit =
        body.storage_limit == null ? null : Number(body.storage_limit);
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_receive_mail")) {
      updates.can_receive_mail = Boolean(body.can_receive_mail);
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_receive_parcels")) {
      updates.can_receive_parcels = Boolean(body.can_receive_parcels);
    }
    if (Object.prototype.hasOwnProperty.call(body, "can_digitize")) {
      updates.can_digitize = Boolean(body.can_digitize);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    const updated = await adminUpdateMailroomPlan({
      id,
      updates: updates as {
        name?: string;
        price?: number;
        description?: string | null;
        storage_limit?: number | null;
        can_receive_mail?: boolean;
        can_receive_parcels?: boolean;
        can_digitize?: boolean;
      },
    });

    const normalized =
      updated == null
        ? null
        : {
            id: String(updated.mailroom_plan_id ?? ""),
            name: String(updated.mailroom_plan_name ?? ""),
            price: Number(updated.mailroom_plan_price ?? 0),
            description: updated.mailroom_plan_description ?? null,
            storage_limit:
              updated.mailroom_plan_storage_limit == null
                ? null
                : Number(updated.mailroom_plan_storage_limit),
            can_receive_mail: Boolean(updated.mailroom_plan_can_receive_mail),
            can_receive_parcels: Boolean(
              updated.mailroom_plan_can_receive_parcels,
            ),
            can_digitize: Boolean(updated.mailroom_plan_can_digitize),
          };

    return NextResponse.json(
      { message: "Plan updated", data: normalized },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error(`admin.mailroom.plans.${(await params).id}.PATCH:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
