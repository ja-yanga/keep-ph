import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { label, line1, line2, city, region, postal, is_default } = body;

    if (!line1) {
      return NextResponse.json({ error: "line1 required" }, { status: 400 });
    }

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("user_address_table")
      .select("user_id")
      .eq("user_address_id", id)
      .maybeSingle();

    if (exErr || !existing) {
      return NextResponse.json(
        {
          error: "Not found",
          id,
          details: exErr?.message ?? "no row returned",
        },
        { status: 404 },
      );
    }

    if (is_default) {
      await supabaseAdmin
        .from("user_address_table")
        .update({ user_address_is_default: false })
        .eq("user_id", existing.user_id);
    }

    const selectCols = [
      "user_address_id",
      "user_id",
      "user_address_label",
      "user_address_line1",
      "user_address_line2",
      "user_address_city",
      "user_address_region",
      "user_address_postal",
      "user_address_is_default",
      "user_address_created_at",
      "users_table(users_id, users_email, mobile_number, user_kyc_table(user_kyc_first_name, user_kyc_last_name, user_kyc_status))",
    ].join(",");

    const { data, error } = await supabaseAdmin
      .from("user_address_table")
      .update({
        user_address_label: label ?? null,
        user_address_line1: line1,
        user_address_line2: line2 ?? null,
        user_address_city: city ?? null,
        user_address_region: region ?? null,
        user_address_postal: postal ?? null,
        user_address_is_default: !!is_default,
      })
      .eq("user_address_id", id)
      .select(selectCols)
      .maybeSingle();

    if (error) throw error;

    const row =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const user =
      row && row["users_table"] && typeof row["users_table"] === "object"
        ? (row["users_table"] as Record<string, unknown>)
        : null;
    const kyc =
      user &&
      user["user_kyc_table"] &&
      typeof user["user_kyc_table"] === "object"
        ? (user["user_kyc_table"] as Record<string, unknown>)
        : null;
    const enriched = {
      ...(row || {}),
      users: user,
      user_kyc_first_name:
        kyc && typeof kyc["user_kyc_first_name"] === "string"
          ? kyc["user_kyc_first_name"]
          : null,
      user_kyc_last_name:
        kyc && typeof kyc["user_kyc_last_name"] === "string"
          ? kyc["user_kyc_last_name"]
          : null,
      user_kyc_status:
        kyc && typeof kyc["user_kyc_status"] === "string"
          ? kyc["user_kyc_status"]
          : null,
    };

    return NextResponse.json({ ok: true, address: enriched });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("user_address_table")
      .delete()
      .eq("user_address_id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
