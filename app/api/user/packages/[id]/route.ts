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
      .select("id")
      .eq("id", pkg.registration_id)
      .eq("user_id", userId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 }
      );
    }

    // 4. Update Package
    const { data, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update({
        status: body.status,
        notes: body.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Update package error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
