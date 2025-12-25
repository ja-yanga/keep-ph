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

    // fetch file row with mailbox_item -> registration
    const { data: fileRow, error: fileErr } = await admin
      .from("mailroom_file_table")
      .select(
        `
        mailroom_file_id,
        mailroom_file_url,
        mailbox_item_table (
          mailbox_item_id,
          mailroom_registration_id
        )
      `,
      )
      .eq("mailroom_file_id", scanId)
      .single();

    if (fileErr || !fileRow) {
      console.error("[DELETE] file not found", fileErr);
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // mailbox_item_table may be returned as object or array
    const mailboxItem =
      (fileRow as Record<string, unknown>)["mailbox_item_table"] ?? null;
    let regId: string | undefined;
    if (Array.isArray(mailboxItem)) {
      regId = (mailboxItem[0] as Record<string, unknown>)
        ?.mailroom_registration_id as string | undefined;
    } else if (mailboxItem && typeof mailboxItem === "object") {
      regId = (mailboxItem as Record<string, unknown>)
        .mailroom_registration_id as string | undefined;
    }

    if (!regId) {
      return NextResponse.json({ error: "Orphan file" }, { status: 400 });
    }

    // verify registration belongs to current user (use correct table name)
    const { data: regRow, error: regErr } = await admin
      .from("mailroom_registration_table")
      .select("mailroom_registration_id, user_id")
      .eq("mailroom_registration_id", regId)
      .single();

    if (regErr || !regRow) {
      console.error("[DELETE] registration not found", regErr);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    if ((regRow as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileUrl: string =
      (fileRow as { mailroom_file_url?: string }).mailroom_file_url || "";
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
      .from("mailroom_file_table")
      .delete()
      .eq("mailroom_file_id", scanId);

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
