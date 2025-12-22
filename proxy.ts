import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Get session data from updateSession
  const { supabaseResponse, user } = await updateSession(request);

  // Define Protected and Auth Paths
  const url = request.nextUrl.clone();
  const isAuthPage = ["/signin", "/signup", "/forgot-password"].includes(
    url.pathname,
  );

  // CHANGED: Added "/update-password" to public pages to prevent middleware blocking
  // The page itself should handle the "not logged in" state if the session is missing
  const isPublicPage = [
    "/",
    "/api/auth/callback",
    "/api/auth/callback/google",
    "/update-password",
  ].includes(url.pathname);

  // Redirect Logic
  if (isAuthPage) {
    if (user) {
      // If logged in, don't let them see signin page
      url.pathname = "/dashboard";
      const redirectResponse = NextResponse.redirect(url);
      // Copy cookies from supabaseResponse to preserve session
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
    return supabaseResponse;
  }

  if (!user && !isPublicPage) {
    // If not logged in and trying to access protected page (like /dashboard)
    url.pathname = "/signin";
    const redirectResponse = NextResponse.redirect(url);
    // Copy cookies from supabaseResponse to preserve session
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
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
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
