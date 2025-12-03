import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. Create an initial response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Initialize Supabase Client to read the cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // This allows the middleware to refresh the token if needed
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Check Session
  // This will read the 'sb-<project>-auth-token' cookie correctly
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Define Protected and Auth Paths
  const url = request.nextUrl.clone();
  const isAuthPage = ["/signin", "/signup", "/forgot-password"].includes(
    url.pathname
  );

  // CHANGED: Added "/update-password" to public pages to prevent middleware blocking
  // The page itself should handle the "not logged in" state if the session is missing
  const isPublicPage = [
    "/",
    "/api/auth/callback",
    "/api/auth/callback/google",
    "/update-password",
  ].includes(url.pathname);

  // 5. Redirect Logic
  if (isAuthPage) {
    if (user) {
      // If logged in, don't let them see signin page
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user && !isPublicPage) {
    // If not logged in and trying to access protected page (like /dashboard)
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  return response;
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
