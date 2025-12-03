import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // 1. Initialize Supabase Client
  // This automatically connects to the correct cookies (sb-*-auth-token)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // FIX: Explicitly set value to empty string to clear it
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // 2. Sign Out
  // This revokes the token on Supabase servers AND triggers the 'remove' cookie method above
  await supabase.auth.signOut();

  return NextResponse.json(
    { message: "Signed out successfully" },
    { status: 200 }
  );
}
