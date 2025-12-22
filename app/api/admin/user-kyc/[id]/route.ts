import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST(
  req: Request,
  context: { params: Promise<Record<string, string | undefined>> },
) {
  try {
    const supabase = await createClient();

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

    const updatePayload: Record<string, unknown> = {
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
  } catch (err: unknown) {
    console.error("admin KYC action error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
