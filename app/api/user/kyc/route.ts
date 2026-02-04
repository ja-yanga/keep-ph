import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserKYC, submitKYC } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";

export async function POST(req: Request) {
  try {
    // parse form and auth in parallel to reduce total latency
    const formPromise = req.formData();
    const authPromise = (async () => {
      const supabase = await createClient();
      return supabase.auth.getUser();
    })();

    const [form, authRes] = await Promise.all([formPromise, authPromise]);

    const user = authRes?.data?.user;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await submitKYC(form, user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("KYC submit error:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

    const kyc = await getUserKYC(user.id);
    return NextResponse.json({ ok: true, kyc });
  } catch (err) {
    console.error("KYC fetch error:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
