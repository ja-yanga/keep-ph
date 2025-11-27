import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(_: Request) {
  try {
    // attempt server-side sign out (optional)
    const { error } = await supabase.auth.signOut();

    // build response
    const res = NextResponse.json(
      { message: error ? "Signed out (client signout error)" : "Signed out" },
      { status: error ? 400 : 200 }
    );

    // always clear auth cookies so session is removed client-side
    const cookieOpts = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    };

    res.cookies.set("sb-access-token", "", cookieOpts);
    res.cookies.set("sb-refresh-token", "", cookieOpts);
    // optional: clear any other Supabase cookie names you use
    res.cookies.set("sb-anon-token", "", cookieOpts);
    res.cookies.set("next-auth.session-token", "", cookieOpts);

    if (error) {
      return res;
    }

    return res;
  } catch (err: any) {
    const res = NextResponse.json(
      { error: err?.message || "Unexpected error during signout" },
      { status: 500 }
    );

    const cookieOpts = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    };

    res.cookies.set("sb-access-token", "", cookieOpts);
    res.cookies.set("sb-refresh-token", "", cookieOpts);
    return res;
  }
}
