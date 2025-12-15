import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createSupabaseClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(
  req: Request,
  context: { params: Promise<Record<string, string | undefined>> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* noop */
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify requester is admin
    const { data: requester, error: requesterErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (requesterErr) throw requesterErr;
    if (!requester || requester.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // params is a Promise in App Router handlers — await it first
    const resolvedParams = await context.params;
    // support both [id] and [user_id] route param names
    const userId = resolvedParams.user_id ?? resolvedParams.id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    // basic uuid validation to avoid DB cast errors
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").toUpperCase();

    let statusDb: string;
    const now = new Date().toISOString();

    if (action === "VERIFIED") {
      statusDb = "VERIFIED";
    } else if (action === "REJECTED") {
      // map REJECTED to UNVERIFIED to stay compatible with current enum
      statusDb = "UNVERIFIED";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatePayload: any = {
      status: statusDb,
      updated_at: now,
    };
    if (statusDb === "VERIFIED") updatePayload.verified_at = now;

    const { data, error } = await supabaseAdmin
      .from("user_kyc")
      .update(updatePayload)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("admin KYC action error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
