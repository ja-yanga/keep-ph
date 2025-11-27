import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Only protect dashboard routes
  if (!url.pathname.startsWith("/dashboard")) return NextResponse.next();

  // read sb-access-token cookie
  const tokenCookie = req.cookies.get?.("sb-access-token")?.value ?? null;
  if (!tokenCookie) {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  const accessToken = decodeURIComponent(tokenCookie);

  try {
    // verify token via Supabase auth REST (no service_role required)
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
  matcher: ["/dashboard/:path*"],
};
