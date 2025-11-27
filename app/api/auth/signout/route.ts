import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // 1. Prepare the response immediately (we return this success or fail)
  const res = NextResponse.json(
    { message: "Signed out successfully" },
    { status: 200 }
  );

  // 2. Define aggressive cookie clearing options
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0), // Explicitly expire
  };

  // 3. Identify all cookies to clear
  // Start with known Supabase cookies
  const cookiesToClear = new Set([
    "sb-access-token",
    "sb-refresh-token",
    "sb-anon-token",
  ]);

  // Find any other cookies that look like Supabase tokens (e.g. project specific)
  req.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
      cookiesToClear.add(cookie.name);
    }
  });

  // 4. Apply clearing to the response object
  cookiesToClear.forEach((name) => {
    res.cookies.set(name, "", cookieOptions);
  });

  // 5. Add Cache-Control headers to prevent back-button navigation to protected pages
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // 6. Attempt server-side revocation (Best Effort)
  // This invalidates the refresh token in the database.
  try {
    const token = req.cookies.get("sb-access-token")?.value;
    if (token) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      // We must set the session on the client for signOut to know WHO to sign out
      await supabase.auth.signOut({ scope: "global" });
    }
  } catch (err) {
    // We ignore errors here because the user is effectively logged out
    // on the client side due to cookie clearing anyway.
    console.warn("Server-side signOut error:", err);
  }

  return res;
}
