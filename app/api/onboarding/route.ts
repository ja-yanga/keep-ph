import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// debug GET (returns cookie/token and user errors in dev)
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    const accessToken = match ? decodeURIComponent(match[1]) : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // fetch first_name / last_name / role from users table
    let profile: {
      first_name?: string | null;
      last_name?: string | null;
      role?: string | null;
    } | null = null;
    try {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!profileErr && profileData) {
        profile = profileData;
      }
    } catch (e) {
      console.error("profile lookup error:", e);
    }

    // return profile (includes role) and convenience top-level role
    return NextResponse.json({
      ok: true,
      user: userData.user,
      profile,
      role: profile?.role ?? null,
    });
  } catch (err) {
    console.error("onboarding GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      first_name = null,
      last_name = null,
      avatar = null,
    } = body as {
      first_name: string | null;
      last_name: string | null;
      avatar: string | null; // data URL (data:<mime>;base64,...)
    };

    // read access token from HttpOnly cookie (sb-access-token)
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    const accessToken = match ? decodeURIComponent(match[1]) : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // get user from token
    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userErr || !user) {
      console.error("getUser error:", userErr);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    let publicAvatarUrl: string | null = null;

    if (avatar) {
      // avatar is expected as data URL: data:<mime>;base64,<data>
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

      const ext = mime.split("/")[1].replace("+", "-"); // sanitize
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

      // for private bucket: create signed url
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24); // 24 hours

      publicAvatarUrl = signed?.signedUrl ?? null;

      // if you made the bucket public, you can use getPublicUrl instead:
      // const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
      // publicAvatarUrl = publicData.publicUrl;
    }

    // update users table with service role key (server-side)
    const updatePayload: Record<string, any> = {
      first_name,
      last_name,
    };
    if (publicAvatarUrl) updatePayload.avatar_url = publicAvatarUrl;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updatePayload)
      .eq("id", user.id)
      .limit(1);

    if (updateError) {
      console.error("users update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
