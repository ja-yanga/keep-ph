import { NextResponse, NextRequest } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    // allow context.params to be a Promise (per Next types)
    let params = context.params as { id: string } | Promise<{ id: string }>;
    if (params instanceof Promise) {
      params = await params;
    }
    const paramId = (params as { id: string })?.id;

    // debug: log incoming params + url so we can see what Next passes
    console.debug(
      "[DELETE] /api/user/storage params:",
      paramId,
      "url:",
      request.url,
    );

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // fallback: if params.id is undefined, try to derive it from the request URL
    let scanId = paramId;
    if (!scanId) {
      try {
        const parts = new URL(request.url).pathname.split("/").filter(Boolean);
        // expect ... /api/user/storage/<id>
        scanId = parts[parts.length - 1];
      } catch {
        // ignore
      }
    }

    if (!scanId) {
      console.error("[DELETE] missing scan id after fallback");
      return NextResponse.json({ error: "scan id required" }, { status: 400 });
    }

    // use admin client for cross-table checks & storage deletion
    const admin = supabaseAdmin;

    // fetch scan row with package -> registration
    const { data: scanRow, error: scanErr } = await admin
      .from("mailroom_scans")
      .select(`id, file_url, package:mailroom_packages(id, registration_id)`)
      .eq("id", scanId)
      .single();

    if (scanErr || !scanRow) {
      console.error("[DELETE] scan not found", scanErr);
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const pkg = (
      scanRow as {
        package?:
          | { registration_id?: string }
          | Array<{ registration_id?: string }>;
      }
    ).package;
    const regId = Array.isArray(pkg)
      ? pkg[0]?.registration_id
      : pkg?.registration_id;

    if (!regId) {
      return NextResponse.json({ error: "Orphan scan" }, { status: 400 });
    }

    // verify registration belongs to current user
    const { data: regRow, error: regErr } = await admin
      .from("mailroom_registrations")
      .select("id, user_id")
      .eq("id", regId)
      .single();

    if (regErr || !regRow) {
      console.error("[DELETE] registration not found", regErr);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    if (regRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileUrl: string = (scanRow as { file_url?: string }).file_url || "";
    try {
      const match = fileUrl.match(
        /\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/,
      );
      if (match) {
        const bucket = match[1];
        const path = decodeURIComponent(match[2]);
        await admin.storage.from(bucket).remove([path]);
      } else {
        console.debug(
          "[DELETE] could not derive storage path from file_url, skipping storage delete",
          fileUrl,
        );
      }
    } catch (e) {
      console.error(
        "[DELETE] storage delete failed, continuing to delete DB row:",
        e,
      );
    }

    const { error: delErr } = await admin
      .from("mailroom_scans")
      .delete()
      .eq("id", scanId);

    if (delErr) {
      throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("delete scan error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
