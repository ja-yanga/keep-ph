import { getUserSession } from "@/app/actions/get";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Admin client for fetching profile data (bypassing RLS if needed)

export async function GET(_request: Request) {
  // reference unused param to satisfy ESLint
  void _request;
  try {
    // 1. Create the Supabase client using the cookies from the request
    // This automatically handles reading the correct 'sb-*-auth-token' cookies
    const supabase = await createClient();

    // 2. Get the user from the session
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 3. Fetch profile and KYC data via RPC
    const { sessionData, sessionErr } = await getUserSession(user.id);

    if (sessionErr) {
      console.error("session RPC error:", sessionErr);
      throw sessionErr;
    }

    const { profile, kyc, role } =
      sessionData ||
      ({} as {
        profile: Record<string, unknown> | null;
        kyc: { status: string };
        role: string | null;
      });

    return NextResponse.json({
      ok: true,
      user,
      profile,
      role,
      kyc,
      // isKycVerified: kyc.status === "VERIFIED",
      needs_onboarding: false,
    });
  } catch (err: unknown) {
    console.error("session GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
