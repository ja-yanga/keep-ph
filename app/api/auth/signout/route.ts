import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  // 1. Initialize Supabase Client
  // This automatically connects to the correct cookies (sb-*-auth-token)
  const supabase = await createClient();

  // 2. Sign Out
  // This revokes the token on Supabase servers AND triggers the 'remove' cookie method above
  await supabase.auth.signOut();

  return NextResponse.json(
    { message: "Signed out successfully" },
    { status: 200 },
  );
}
