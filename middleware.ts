import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const publicPaths = ["/", "/signin", "/signup"];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 1. Allow explicitly public paths
  if (publicPaths.includes(url.pathname)) {
    return NextResponse.next();
  }

  // 2. Allow API routes (auth endpoints need to be accessible)
  //    and static assets / Next.js internals
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/static") ||
    url.pathname.includes(".") // simplistic check for files like robots.txt, images
  ) {
    return NextResponse.next();
  }

  // 3. Check for session token
  const tokenCookie = req.cookies.get("sb-access-token")?.value ?? null;
  if (!tokenCookie) {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  const accessToken = decodeURIComponent(tokenCookie);

  try {
    // verify token via Supabase auth REST
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!res.ok) {
      url.pathname = "/signin";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (err) {
    console.error("[middleware] session check error:", err);
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
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
