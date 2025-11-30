import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Admin Client (Service Role) - matching your session route
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

    // 1. Extract Token (Logic from api/session/route.ts)
    const cookieHeader = request.headers.get("cookie") ?? "";

    // Try to match the specific cookie used in your session route
    let accessToken = null;
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);

    if (match) {
      accessToken = decodeURIComponent(match[1]);
    } else {
      // Fallback: Check for standard Supabase Auth cookie (sb-<ref>-auth-token)
      // This handles cases where the custom 'sb-access-token' might not be set but the standard one is
      const authCookie = cookieHeader
        .split(";")
        .find(
          (c) => c.trim().startsWith("sb-") && c.trim().endsWith("-auth-token")
        );
      if (authCookie) {
        const val = authCookie.split("=")[1];
        try {
          // Supabase v2 cookies are JSON
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

    // 3. Verify Ownership (User -> Registration)
    // Since we are using Admin client, we MUST manually verify the user owns this registration
    const { data: registration } = await supabaseAdmin
      .from("mailroom_registrations")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // 4. Update Package
    // Securely update only if the package belongs to the user's registration
    const { data, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update({
        status: body.status,
        notes: body.notes,
      })
      .eq("id", id)
      .eq("registration_id", registration.id) // Security Check
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
