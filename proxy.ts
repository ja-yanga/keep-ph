import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Auth pages - only for non-authenticated users
const AUTH_PAGES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/unauthorized",
] as const;
// Public routes - accessible to everyone
const PUBLIC_PAGES = [
  "/",
  "/api/auth/callback",
  "/api/auth/callback/google",
  "/update-password",
  "/unauthorized",
] as const;
// Private routes - role-based access
const PRIVATE_ROLE_PAGES: Record<string, Array<string>> = {
  user: [
    "/dashboard",
    "/mailroom/:path*", // Catch-all for /mailroom/*
    "/referrals",
    "/storage",
    "/account",
    "/unauthorized",
  ],
  admin: [
    "/admin/dashboard",
    "/admin/kyc",
    "/admin/locations",
    "/admin/lockers",
    "/admin/mailrooms",
    "/admin/packages",
    "/admin/plans",
    "/admin/rewards",
    "/admin/stats",
    "/unauthorized",
  ],
};

// Default landing pages per role
const ROLE_DEFAULT_PAGES: Record<string, string> = {
  user: "/dashboard",
  admin: "/admin/dashboard",
};

//  function to copy cookies between responses
function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  });
}

// function to create redirect with cookies
function createRedirect(
  url: URL,
  supabaseResponse: NextResponse,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirectResponse);
  return redirectResponse;
}

// function to check if path matches allowed pattern
function isPathAllowed(currentPath: string, allowedPath: string): boolean {
  // Exact match
  if (allowedPath === currentPath) {
    return true;
  }

  // Catch-all wildcard (e.g., /mailroom/:path* or /mailroom/*)
  if (allowedPath.includes(":path*") || allowedPath.endsWith("/*")) {
    const basePath = allowedPath.replace("/:path*", "").replace("/*", "");
    return currentPath === basePath || currentPath.startsWith(basePath + "/");
  }

  // Dynamic single param route (e.g., /mailroom/:id)
  if (allowedPath.includes(":")) {
    // Split paths into segments
    const allowedSegments = allowedPath.split("/");
    const currentSegments = currentPath.split("/");

    // Must have same number of segments
    if (allowedSegments.length !== currentSegments.length) {
      return false;
    }

    // Check each segment
    return allowedSegments.every((segment, index) => {
      // Dynamic segment matches anything
      if (segment.startsWith(":")) {
        return true;
      }
      // Static segment must match exactly
      return segment === currentSegments[index];
    });
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Get session data
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Check if current path is auth or public
  const isAuthPage = (AUTH_PAGES as readonly string[]).includes(url.pathname);
  const isPublicPage = (PUBLIC_PAGES as readonly string[]).includes(
    url.pathname,
  );

  // If it's a public page, allow access
  if (isPublicPage) {
    return supabaseResponse;
  }

  // If user is not logged in
  if (!user) {
    // Redirect to signin for protected pages
    if (!isAuthPage) {
      url.pathname = "/signin";
      return createRedirect(url, supabaseResponse);
    }
    // Allow access to auth pages
    return supabaseResponse;
  }

  // get role from session after signup
  const session = await supabase.auth.getSession();
  const role = session?.data.session?.user?.user_metadata?.role || null;

  // If logged in user tries to access auth pages, redirect to dashboard
  if (isAuthPage) {
    url.pathname =
      role && ROLE_DEFAULT_PAGES[role]
        ? ROLE_DEFAULT_PAGES[role]
        : "/dashboard";
    return createRedirect(url, supabaseResponse);
  }

  // If no role found, redirect to unauthorized
  if (!role) {
    url.pathname = "/unauthorized";
    return createRedirect(url, supabaseResponse);
  }

  // Check if user has access to the current route
  const hasAccess = PRIVATE_ROLE_PAGES[role].some((allowedPath) =>
    isPathAllowed(url.pathname, allowedPath),
  );

  // If user doesn't have access, redirect to their default page
  if (!hasAccess) {
    url.pathname = ROLE_DEFAULT_PAGES[role] || "/dashboard";
    return createRedirect(url, supabaseResponse);
  }

  // User has access - allow request
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     *
     * Note: If you want middleware to run on /api routes too, remove |api from the negative lookahead.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};
