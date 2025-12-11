import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client for fetching profile data (bypassing RLS if needed)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Create the Supabase client using the cookies from the request
    // This automatically handles reading the correct 'sb-*-auth-token' cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // We are only reading here, so we don't need to set cookies
          },
        },
      }
    );

    // 2. Get the user from the session
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 3. Fetch profile data
    let profile: Record<string, any> | null = null;
    let needs_onboarding = true;

    try {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("users")
        .select(
          "first_name, last_name, role, needs_onboarding, avatar_url, referral_code"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!profileErr && profileData) {
        profile = profileData;
        if (typeof profileData.needs_onboarding === "boolean") {
          needs_onboarding = profileData.needs_onboarding;
        } else {
          needs_onboarding = !(profileData.first_name && profileData.last_name);
        }
      }
    } catch (e) {
      console.error("profile lookup error:", e);
    }

    // 4. Fetch KYC status for the user (only status needed)
    // default to UNVERIFIED when no record exists
    let kyc: Record<string, any> = { status: "UNVERIFIED" };
    try {
      const { data: kycData, error: kycErr } = await supabaseAdmin
        .from("user_kyc")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!kycErr && kycData) kyc = kycData;
    } catch (e) {
      console.error("kyc lookup error:", e);
      // keep default UNVERIFIED on error
    }

    return NextResponse.json({
      ok: true,
      user: user,
      profile,
      role: profile?.role ?? null,
      kyc: kyc, // { status: "VERIFIED" | "SUBMITTED" | "UNVERIFIED" }
      isKycVerified: kyc.status === "VERIFIED",
    });
  } catch (err) {
    console.error("session GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
