import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    // set HttpOnly cookies for server-side usage
    const res = NextResponse.json({ user: data.user });
    if (data.session) {
      res.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      // make the server supabase client use the newly created session so RLS sees the user
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // now query the users table for role and profile fields
      const userId = data.user?.id ?? data.session.user?.id ?? null;
      if (userId) {
        const { data: userRow, error: userRowError } = await supabase
          .from("users")
          .select("role, first_name, last_name, avatar_url")
          .eq("id", userId)
          .single();

        if (userRowError) {
          console.warn("Could not read users row:", userRowError);
        } else {
          console.log("signed-in user role:", userRow.role);

          // determine if onboarding is needed: missing first/last name or avatar
          const needsOnboarding =
            !userRow.first_name || !userRow.last_name || !userRow.avatar_url;

          // include role, session and onboarding flag in response
          return NextResponse.json({
            user: data.user,
            role: userRow.role,
            session: data.session,
            needsOnboarding,
          });
        }
      }
    }

    // fallback: if no session or userRow wasn't found, infer from auth user metadata
    const meta = data.user?.user_metadata ?? {};
    const needsOnboardingFallback =
      !meta.first_name || !meta.last_name || !meta.avatar_url;

    return NextResponse.json({
      user: data.user,
      session: data.session,
      needsOnboarding: needsOnboardingFallback,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
