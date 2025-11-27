import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    // Best effort server-side signout
    // We catch errors here so we don't stop the cookie clearing process
    await supabase.auth.signOut().catch((err) => {
      console.warn("Supabase signOut error:", err);
    });

    const res = NextResponse.json(
      { message: "Signed out successfully" },
      { status: 200 }
    );

    // Force clear cookies with aggressive options
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      expires: new Date(0), // Explicitly expire
    };

    // 1. Clear known cookies explicitly
    res.cookies.set("sb-access-token", "", cookieOptions);
    res.cookies.set("sb-refresh-token", "", cookieOptions);
    res.cookies.set("sb-anon-token", "", cookieOptions);

    // 2. Clear any other cookies that look like Supabase tokens
    // This handles cases where the client might be using different cookie names (e.g. sb-<project>-auth-token)
    req.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
        res.cookies.set(cookie.name, "", cookieOptions);
      }
    });

    // 3. Prevent caching of the signout response
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (err: any) {
    console.error("Signout route error:", err);
    // Fallback response if something crashes
    const res = NextResponse.json(
      { error: "Error during signout" },
      { status: 500 }
    );
    // Still try to clear cookies even in error case
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      expires: new Date(0),
    };

    res.cookies.set("sb-access-token", "", cookieOptions);
    res.cookies.set("sb-refresh-token", "", cookieOptions);
    res.cookies.set("sb-anon-token", "", cookieOptions);

    req.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
        res.cookies.set(cookie.name, "", cookieOptions);
      }
    });

    return res;
  }
}
