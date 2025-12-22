import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function GET(req: Request) {
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
        ].join(","),
      )
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (q) {
      // simple ilike search against name and id number
      builder.or(
        `full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,id_document_number.ilike.%${q}%`,
      );
    }

    const { data, error } = await builder;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error("admin KYC list error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
