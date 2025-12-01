import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseCookies(header: string) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const idx = c.indexOf("=");
      const k = c.slice(0, idx).trim();
      const v = c.slice(idx + 1).trim();
      try {
        return [k, decodeURIComponent(v)];
      } catch {
        return [k, v];
      }
    })
  );
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const cookies = parseCookies(cookieHeader);

    const token = cookies["sb-access-token"] ?? cookies["sb:token"] ?? null;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthenticated (no token)" },
        { status: 401 }
      );
    }

    // validate token with Supabase auth endpoint to get user id
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await userRes.json();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Unable to resolve user id" },
        { status: 401 }
      );
    }

    // fetch registrations for this user and include linked location & plan info
    const { data, error } = await supabaseAdmin
      .from("mailroom_registrations")
      .select(
        `
        id,
        user_id,
        location_id,
        plan_id,
        locker_qty,
        months,
        notes,
        created_at,
        full_name,
        email,
        mobile,
        mailroom_locations ( id, name, city, region, barangay, zip ),
        mailroom_plans ( id, name, price ),
        packages:mailroom_packages ( id, status ) 
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("registrations fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to load registrations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("registrations route unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
