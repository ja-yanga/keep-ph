import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Admin client for fetching profile data (bypassing RLS if needed)
const supabaseAdmin = createSupabaseServiceClient();

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

    // 3. Fetch profile data (updated schema: users_table)
    let profile: Record<string, unknown> | null = null;
    let resolvedRole: string | null = null;

    try {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("users_table")
        .select(
          "users_id, users_email, users_role, users_avatar_url, users_referral_code, users_is_verified, mobile_number",
        )
        .eq("users_id", user.id)
        .maybeSingle();

      if (!profileErr && profileData) {
        profile = profileData as Record<string, unknown>;
        // prefer explicit users_role, fall back to older keys if present
        resolvedRole =
          ((profileData as Record<string, unknown>).users_role as string) ??
          ((profileData as Record<string, unknown>).user_role as string) ??
          null;
      }
    } catch (e: unknown) {
      console.error("profile lookup error:", e);
    }

    // 4. Fetch KYC status for the user (only status needed)
    // default to UNVERIFIED when no record exists
    let kyc: Record<string, unknown> = { status: "UNVERIFIED" };
    try {
      const { data: kycData, error: kycErr } = await supabaseAdmin
        .from("user_kyc")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!kycErr && kycData) kyc = kycData as Record<string, unknown>;
    } catch (e: unknown) {
      console.error("kyc lookup error:", e);
      // keep default UNVERIFIED on error
    }

    return NextResponse.json({
      ok: true,
      user,
      profile,
      role: resolvedRole ?? null,
      kyc,
      isKycVerified: (kyc as Record<string, unknown>).status === "VERIFIED",
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
