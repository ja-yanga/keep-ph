import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// Admin client for database updates (bypassing RLS)
const supabaseAdmin = createSupabaseServiceClient();

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(req: Request) {
  try {
    // 1. Verify User via Cookie (using @supabase/ssr)
    const supabase = createSupabaseServiceClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("Auth error:", userErr);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Parse Body
    const body = await req.json();
    const {
      first_name = null,
      last_name = null,
      avatar = null,
    } = body as {
      first_name: string | null;
      last_name: string | null;
      avatar: string | null; // data URL
    };

    let publicAvatarUrl: string | null = null;

    // 3. Handle Avatar Upload
    if (avatar) {
      const dataUrlMatch = avatar.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
      );
      if (!dataUrlMatch) {
        return NextResponse.json(
          { error: "Invalid avatar data" },
          { status: 400 },
        );
      }

      const mime = dataUrlMatch[1];
      const base64 = dataUrlMatch[2];
      const buffer = Buffer.from(base64, "base64");

      const ext = mime.split("/")[1].replace("+", "-");
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const bucket = "AVATARS";

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, buffer, { contentType: mime, upsert: true });

      if (uploadError) {
        console.error("storage upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 },
        );
      }

      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      publicAvatarUrl = signed?.signedUrl ?? null;
    }
    type UserDetails = {
      users_first_name: string;
      users_last_name: string;
      users_needs_onboarding: boolean;
      users_avatar_url: string | null;
    };
    // 4. Update User Profile (using Admin client to bypass RLS)
    const updatePayload: UserDetails = {
      users_first_name: first_name || "",
      users_last_name: last_name || "",
      users_needs_onboarding: false,
      users_avatar_url: publicAvatarUrl || null,
    };
    // if (publicAvatarUrl) updatePayload.users_avatar_url = publicAvatarUrl;

    const { error: updateError } = await supabaseAdmin
      .from("users_table")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      console.error("users update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, needs_onboarding: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
