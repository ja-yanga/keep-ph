import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { submitKYC } from "@/app/actions/post";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const result = await submitKYC(form);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

// NEW: GET handler returns current user's KYC row (if any)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("user_kyc_table")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (req.method === "GET") {
      return NextResponse.json({ ok: true, kyc: data ?? null });
    }

    // return NextResponse.json({ ok: true, kyc: data ?? null });
  } catch (err) {
    console.error("KYC fetch error:", err);
    return NextResponse.json({ error: err as string }, { status: 500 });
  }
}
