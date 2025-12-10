import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <- params is a Promise in Next App Router
) {
  try {
    const { id } = await params; // unwrap here
    const body = await req.json();
    const { label, line1, line2, city, region, postal, is_default } = body;

    // DEBUG: log incoming request for diagnosis
    console.log("[user.addresses.PUT] id:", id);
    console.log("[user.addresses.PUT] body keys:", Object.keys(body));

    // Quick env check (does not print secrets)
    console.log(
      "[user.addresses.PUT] SUPABASE_SERVICE_ROLE_KEY set:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("user_addresses")
      .select("user_id")
      .eq("id", id)
      .single();

    console.log("[user.addresses.PUT] select result:", { existing, exErr });

    if (exErr || !existing) {
      // return more detail while debugging (remove details in production)
      return NextResponse.json(
        {
          error: "Not found",
          id,
          details: exErr?.message ?? "no row returned",
        },
        { status: 404 }
      );
    }

    if (is_default) {
      await supabaseAdmin
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", existing.user_id);
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .update({
        label: label ?? null,
        line1,
        line2: line2 ?? null,
        city,
        region,
        postal,
        is_default: !!is_default,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, address: data });
  } catch (err: any) {
    console.error("user.addresses.PUT:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <- unwrap here as well
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("user_addresses")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("user.addresses.DELETE:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
