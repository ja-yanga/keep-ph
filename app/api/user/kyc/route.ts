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

export async function POST(req: Request) {
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

    const form = await req.formData();
    const document_type = String(form.get("document_type") ?? "");
    const document_number = String(form.get("document_number") ?? "");
    // read name/address snapshot fields (optional from client)
    const first_name = String(form.get("first_name") ?? "");
    const last_name = String(form.get("last_name") ?? "");
    const full_name = String(
      form.get("full_name") ?? `${first_name} ${last_name}`
    ).trim();
    const address_line1 = String(form.get("address_line1") ?? "");
    const address_line2 = String(form.get("address_line2") ?? "");
    const city = String(form.get("city") ?? "");
    const region = String(form.get("region") ?? "");
    const postal = String(form.get("postal") ?? "");
    const birth_date = String(form.get("birth_date") ?? ""); // NEW

    const front = form.get("front") as File | null;
    const back = form.get("back") as File | null;

    if (!document_type || !document_number || !front || !back) {
      return NextResponse.json(
        {
          error:
            "document_type, document_number, front and back files are required",
        },
        { status: 400 }
      );
    }

    // basic file size guard (10 MB)
    const MAX_BYTES = 10 * 1024 * 1024;
    if ((front.size ?? 0) > MAX_BYTES || (back.size ?? 0) > MAX_BYTES) {
      return NextResponse.json(
        { error: "Files must be <= 10MB" },
        { status: 400 }
      );
    }

    const bucket = "user-kyc"; // ensure this bucket exists in Supabase storage
    const ts = Date.now();
    const frontName = `${user.id}/front-${ts}-${
      (front as any).name ?? "front"
    }`;
    const backName = `${user.id}/back-${ts}-${(back as any).name ?? "back"}`;

    const frontBuffer = Buffer.from(await front.arrayBuffer());
    const backBuffer = Buffer.from(await back.arrayBuffer());

    const { error: fe } = await supabaseAdmin.storage
      .from(bucket)
      .upload(frontName, frontBuffer, {
        contentType: front.type,
        upsert: true,
      });
    if (fe) throw fe;

    const { error: be } = await supabaseAdmin.storage
      .from(bucket)
      .upload(backName, backBuffer, {
        contentType: back.type,
        upsert: true,
      });
    if (be) throw be;

    const { data: frontUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(frontName);
    const { data: backUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(backName);
    const id_front_url = frontUrlData?.publicUrl ?? "";
    const id_back_url = backUrlData?.publicUrl ?? "";

    const upsertPayload = {
      user_id: user.id,
      status: "SUBMITTED",
      id_document_type: document_type,
      id_document_number: document_number,
      id_front_url,
      id_back_url,
      first_name,
      last_name,
      full_name,
      address: {
        line1: address_line1,
        line2: address_line2,
        city,
        region,
        postal,
      },
      birth_date: birth_date || null, // NEW
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabaseAdmin
      .from("user_kyc")
      .upsert(upsertPayload, { onConflict: "user_id" });
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, status: "SUBMITTED" });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

// NEW: GET handler returns current user's KYC row (if any)
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

    const { data, error } = await supabaseAdmin
      .from("user_kyc")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, kyc: data ?? null });
  } catch (err: any) {
    console.error("KYC fetch error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
