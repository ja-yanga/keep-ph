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

export async function GET(req: Request) {
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

    // optional: support ?q=search and ?limit
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "500");

    const builder = supabaseAdmin
      .from("user_kyc")
      .select(
        [
          "id",
          "user_id",
          "status",
          "id_document_type",
          "id_document_number",
          "id_front_url",
          "id_back_url",
          "first_name",
          "last_name",
          "full_name",
          "address",
          "submitted_at",
          "verified_at",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (q) {
      // simple ilike search against name and id number
      builder.or(
        `full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,id_document_number.ilike.%${q}%`
      );
    }

    const { data, error } = await builder;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("admin KYC list error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
