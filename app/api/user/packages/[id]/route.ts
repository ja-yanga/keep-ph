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

    // 1. Extract Token
    const cookieHeader = request.headers.get("cookie") ?? "";
    let accessToken = null;
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);

    if (match) {
      accessToken = decodeURIComponent(match[1]);
    } else {
      const authCookie = cookieHeader
        .split(";")
        .find(
          (c) => c.trim().startsWith("sb-") && c.trim().endsWith("-auth-token")
        );
      if (authCookie) {
        const val = authCookie.split("=")[1];
        try {
          const json = JSON.parse(decodeURIComponent(val));
          accessToken = json.access_token;
        } catch {
          accessToken = val;
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Verify User
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 3. Verify Ownership (CORRECTED LOGIC)
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
