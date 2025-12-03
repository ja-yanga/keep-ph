import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use NEXT_PUBLIC_SUPABASE_URL for consistency
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for database updates (bypassing RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Verify User via Cookie (using @supabase/ssr)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // We are only reading here
          },
        },
      }
    );

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
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );
      if (!dataUrlMatch) {
        return NextResponse.json(
          { error: "Invalid avatar data" },
          { status: 400 }
        );
      }

      const mime = dataUrlMatch[1];
      const base64 = dataUrlMatch[2];
      const buffer = Buffer.from(base64, "base64");

      const ext = mime.split("/")[1].replace("+", "-");
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const bucket = "avatars";

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, buffer, { contentType: mime, upsert: true });

      if (uploadError) {
        console.error("storage upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 }
        );
      }

      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      publicAvatarUrl = signed?.signedUrl ?? null;
    }

    // 4. Update User Profile (using Admin client to bypass RLS)
    const updatePayload: Record<string, any> = {
      first_name,
      last_name,
      needs_onboarding: false,
    };
    if (publicAvatarUrl) updatePayload.avatar_url = publicAvatarUrl;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      console.error("users update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, needs_onboarding: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
