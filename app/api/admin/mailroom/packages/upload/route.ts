import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";

const supabaseAdmin = createSupabaseServiceClient();

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "file required" }, { status: 400 });

    // Optional: accept user_id in form data to place file under a user folder
    const rawUserId = form.get("user_id");
    // sanitize user id to safe folder name (allow alphanum, -, _)
    const userId =
      rawUserId && typeof rawUserId === "string"
        ? String(rawUserId).replace(/[^a-zA-Z0-9-_]/g, "")
        : null;

    const bucket = "PACKAGES-PHOTO"; // your new bucket
    const fileName = `${Date.now()}-${file.name ?? "photo"}`;
    const path = userId ? `${userId}/${fileName}` : fileName;

    // Node runtime: upload buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    // Return public URL (or createSignedUrl if bucket is private)
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (err: unknown) {
    console.error("upload error", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
