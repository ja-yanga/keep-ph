import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client for database operations
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Authenticate User via Cookie (using @supabase/ssr)
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // We are only reading here
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // pagination / compact query params
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const offset = (page - 1) * limit;
    const compact = url.searchParams.get("compact") === "1";

    // fetch registrations for this user and include linked location & plan info
    // select only required fields; when compact=1 return fewer fields
    const selectFields = compact
      ? `id, mailroom_code, created_at, mailroom_locations ( id, name ), mailroom_plans ( id, name )`
      : `
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
        mailroom_code,
        auto_renew,
        mailroom_locations ( id, name, city, region, barangay, zip ),
        mailroom_plans ( id, name, price ),
        packages:mailroom_packages ( id, status )
      `;

    const { data, error, count } = await supabaseAdmin
      .from("mailroom_registrations")
      .select(selectFields, { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("registrations fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to load registrations" },
        { status: 500 }
      );
    }

    // return paginated data + total count; set short s-maxage for server cache
    return NextResponse.json(
      { data, meta: { total: count ?? data?.length ?? 0, page, limit } },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("registrations route unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
