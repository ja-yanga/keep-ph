import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Admin Client (Service Role)
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "Registration ID is required" },
        { status: 400 }
      );
    }

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

    // 3. Verify Ownership & Get Plan Limit
    // We use 'any' here to bypass the strict type check on the joined relation
    const { data: registration } = await supabaseAdmin
      .from("mailroom_registrations")
      .select(
        `
        user_id,
        plan:mailroom_plans(storage_limit)
      `
      )
      .eq("id", registrationId)
      .single();

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    if (registration.user_id !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to view these files" },
        { status: 403 }
      );
    }

    // 4. Fetch Scans
    const { data: scans, error } = await supabaseAdmin
      .from("mailroom_scans")
      .select(
        `
        *,
        package:mailroom_packages!inner(
          tracking_number,
          registration_id
        )
      `
      )
      .eq("package.registration_id", registrationId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Calculate Usage
    // Safe access to plan data
    const reg: any = registration;
    const planData = Array.isArray(reg.plan) ? reg.plan[0] : reg.plan;
    const limitMb = planData?.storage_limit || 100; // Default to 100MB

    const totalUsedMb = scans.reduce(
      (acc, scan) => acc + (scan.file_size_mb || 0),
      0
    );

    return NextResponse.json({
      scans,
      usage: {
        used_mb: totalUsedMb,
        limit_mb: limitMb,
        percentage:
          limitMb > 0 ? Math.min((totalUsedMb / limitMb) * 100, 100) : 0,
      },
    });
  } catch (err: any) {
    console.error("Fetch scans error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
