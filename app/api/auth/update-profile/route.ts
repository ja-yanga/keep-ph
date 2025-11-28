import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Session
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Get Body
    const body = await req.json();
    const { first_name, last_name, avatar_data_url } = body;

    let publicAvatarUrl: string | null = null;

    // 3. Handle Avatar Upload (Server-side)
    if (avatar_data_url) {
      // Expecting data URL: data:image/png;base64,iVBOR...
      const matches = avatar_data_url.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid avatar data" },
          { status: 400 }
        );
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const fileExt = mimeType.split("/")[1] || "png";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 }
        );
      }

      // Get Public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      publicAvatarUrl = urlData.publicUrl;
    }

    // 4. Update Profile
    const updatePayload: any = {
      first_name,
      last_name,
    };

    // Only update avatar_url if a new one was generated
    if (publicAvatarUrl) {
      updatePayload.avatar_url = publicAvatarUrl;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (err: any) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
