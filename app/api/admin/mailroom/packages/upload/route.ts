import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const bucket = "packages-photo"; // your new bucket
    const fileName = `${Date.now()}-${(file as any).name ?? "photo"}`;
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
  } catch (err: any) {
    console.error("upload error", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
