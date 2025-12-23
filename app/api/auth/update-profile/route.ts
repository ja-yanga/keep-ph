import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

// Admin client for database/storage operations (bypassing RLS)
const supabaseAdmin = createSupabaseServiceClient();

export async function POST(req: NextRequest) {
  try {
    // Authenticate User via Cookie (server-side)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { avatar_data_url } = body;

    let publicAvatarUrl: string | null = null;

    // Handle Avatar Upload (Server-side)
    if (avatar_data_url) {
      const matches = (avatar_data_url as string).match(
        /^data:(.+);base64,(.+)$/,
      );
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid avatar data" },
          { status: 400 },
        );
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const fileExt = mimeType.split("/")[1] || "png";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("AVATARS")
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 },
        );
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("AVATARS")
        .getPublicUrl(fileName);

      publicAvatarUrl = urlData.publicUrl ?? null;
    }

    // Update users_table avatar column only (first/last name come from KYC table and are read-only)
    const updatePayload: Record<string, unknown> = {};
    if (publicAvatarUrl) updatePayload.users_avatar_url = publicAvatarUrl;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "Nothing to update" });
    }

    const { error: updateError } = await supabaseAdmin
      .from("users_table")
      .update(updatePayload)
      .eq("users_id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (err: unknown) {
    console.error("Update profile error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
