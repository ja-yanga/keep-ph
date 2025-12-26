import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Path configuration
const AUTH_PAGES = ["/signin", "/signup", "/forgot-password"] as const;
const PUBLIC_PAGES = [
  "/",
  "/api/auth/callback",
  "/api/auth/callback/google",
  "/update-password",
] as const;

export async function proxy(request: NextRequest) {
  // Get session data from updateSession (which runs getClaims())
  const { supabaseResponse, user } = await updateSession(request);

  // Define Protected and Auth Paths
  const url = request.nextUrl.clone();
  const isAuthPage = (AUTH_PAGES as readonly string[]).includes(url.pathname);
  const isPublicPage = (PUBLIC_PAGES as readonly string[]).includes(
    url.pathname,
  );

  // Redirect Logic
  if (isAuthPage) {
    if (user) {
      // If logged in, don't let them see signin page
      url.pathname = "/dashboard";
      const redirectResponse = NextResponse.redirect(url);

      // Copy all cookies from supabaseResponse to redirectResponse
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        });
      });

      return redirectResponse;
    }
    return supabaseResponse;
  }

  if (!user && !isPublicPage) {
    // If not logged in and trying to access protected page (like /dashboard)
    url.pathname = "/signin";
    const redirectResponse = NextResponse.redirect(url);

    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      });
    });

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     *
     * Note: If you want middleware to run on /api routes too, remove |api from the negative lookahead.
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
