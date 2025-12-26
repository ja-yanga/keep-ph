import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Start with a NextResponse we can later modify / return
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing Supabase environment variables. Please check your .env.local file.",
    );
    return {
      supabase: null,
      supabaseResponse,
      user: null,
      claims: null,
      userId: null,
    };
  }

  // Always create a fresh server client per-request (do not reuse globally)
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // Read cookies from the incoming request
      getAll() {
        return request.cookies.getAll();
      },
      // When Supabase wants to set cookies, capture them and apply to our response.
      setAll(cookiesToSet) {
        // Do NOT mutate request.cookies here — it's read-only in middleware/runtime.
        // Instead, create a new NextResponse (or update existing) and set cookies on it.
        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: call getClaims immediately to verify tokens and refresh if possible.
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    // Fail-closed: treat errors from getClaims as unauthenticated.
    // Log the error for observability (replace with your logger if desired)
    console.error("supabase.auth.getClaims error:", error);
    return {
      supabase,
      supabaseResponse,
      user: null,
      claims: null,
      userId: null,
    };
  }

  const claims = data?.claims ?? null;
  const userId = claims?.sub ?? null;

  // Get full user object if we have a valid userId
  // Note: We call getUser() to get the full user object, but we could optimize
  // by using claims data if we only need basic info (id, email from claims)
  let user = null;
  if (userId) {
    // getUser() will use the cookies we set on the response via the client cookies handler
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("supabase.auth.getUser error:", userError);
      // treat as unauthenticated if fetching user failed
      user = null;
    } else {
      user = userData?.user ?? null;
    }
  }

  return {
    supabase,
    supabaseResponse,
    user,
    claims,
    userId,
  };
}
