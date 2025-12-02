import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Pages that logged-in users should be redirected AWAY from
const authPaths = [
  "/",
  "/signin",
  "/signup",
  "/forgot-password",
  "/update-password",
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 1. Allow API routes and static assets immediately
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/static") ||
    url.pathname.includes(".") // simplistic check for files like robots.txt, images
  ) {
    return NextResponse.next();
  }

  // 2. Check for session token
  const tokenCookie = req.cookies.get("sb-access-token")?.value ?? null;
  let isValidSession = false;

  if (tokenCookie) {
    const accessToken = decodeURIComponent(tokenCookie);
    try {
      // Verify token via Supabase auth REST
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });

      if (res.ok) {
        isValidSession = true;
      }
    } catch (err) {
      console.error("[middleware] session check error:", err);
    }
  }

  // 3. Handle Auth Paths (Signin, Signup, Home)
  if (authPaths.includes(url.pathname)) {
    if (isValidSession) {
      // User is already logged in, redirect to dashboard
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // User is not logged in, allow access to public pages
    return NextResponse.next();
  }

  // 4. Handle Protected Paths (Everything else)
  if (!isValidSession) {
    // User is not logged in, redirect to signin
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // User is logged in and accessing a protected route
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/data (static data)
     * - favicon.ico
     * - api (API routes)
     */
    "/((?!_next/static|_next/data|favicon.ico|api).*)",
  ],
};
