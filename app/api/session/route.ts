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

    const response = NextResponse.json({
      ok: true,
      user,
      profile,
      role,
      kyc,
      mobile_number:
        (profile as Record<string, unknown> | null)?.mobile_number ?? null,
      // isKycVerified: kyc.status === "VERIFIED",
      needs_onboarding: false,
    });

    // Allow short caching to enable bfcache on pages
    // Session data changes infrequently, so 10 seconds is safe
    response.headers.set(
      "Cache-Control",
      "private, max-age=10, stale-while-revalidate=30",
    );

    return response;
  } catch (err: unknown) {
    console.error("session GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
