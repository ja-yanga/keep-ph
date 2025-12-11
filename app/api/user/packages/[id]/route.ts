import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    const cookieStore = await cookies();

    // 1. Authenticate User via Cookie (using @supabase/ssr)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // We are only reading here
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // 3. Verify Ownership
    // First, find the package to see which registration it belongs to
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("mailroom_packages")
      .select("registration_id")
      .eq("id", id)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Second, verify that specific registration belongs to the user
    const { data: registration, error: regError } = await supabaseAdmin
      .from("mailroom_registrations")
      .select("id, user_id")
      .eq("id", pkg.registration_id)
      .eq("user_id", userId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 }
      );
    }

    // Build updates object
    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    // keep notes support for other actions (but UI will stop using it for release)
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.release_to_name !== undefined)
      updates.release_to_name = body.release_to_name;

    // If client sent a selected_address_id, validate ownership and persist ID + formatted copy
    if (body.selected_address_id) {
      const selectedAddressId = body.selected_address_id;
      const { data: addr, error: addrErr } = await supabaseAdmin
        .from("user_addresses")
        .select(
          "id, user_id, label, contact_name, line1, line2, city, region, postal"
        )
        .eq("id", selectedAddressId)
        .single();

      if (addrErr || !addr) {
        return NextResponse.json(
          { error: "Selected address not found" },
          { status: 400 }
        );
      }

      // Ensure address belongs to the authenticated user (registration.user_id === userId)
      if (String(addr.user_id) !== String(userId)) {
        return NextResponse.json(
          { error: "Address does not belong to this user" },
          { status: 403 }
        );
      }

      const formatted = [
        addr.label ?? "",
        addr.line1 ?? "",
        addr.line2 ?? "",
        addr.city ?? "",
        addr.region ?? "",
        addr.postal ?? "",
      ]
        .filter(Boolean)
        .join(", ");

      updates.release_address_id = selectedAddressId;
      updates.release_address = formatted;

      // If client didn't provide explicit release_to_name, use contact_name from address (snapshot)
      if (
        body.release_to_name === undefined ||
        body.release_to_name === null ||
        body.release_to_name === ""
      ) {
        updates.release_to_name = addr.contact_name ?? null;
      }
    }

    // 4. Update Package
    const { data, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, package: data });
  } catch (err) {
    console.error("Update package error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
