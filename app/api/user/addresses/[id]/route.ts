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
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, address: data });
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
