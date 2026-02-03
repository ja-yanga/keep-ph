import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;

      // Get the session after exchange
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const supabaseAdmin = createSupabaseServiceClient();

        // Update auth.users metadata to include role (trigger will sync to users_table)
        await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
          user_metadata: {
            ...session.user.user_metadata,
            role: "user",
          },
        });

        // Check if user exists in public 'users' table
        const { data: existingUser } = await supabaseAdmin
          .from("users_table")
          .select("users_id")
          .eq("users_id", session.user.id)
          .single();

        if (!existingUser) {
          const { error: insertError } = await supabaseAdmin
            .from("users_table")
            .insert({
              users_id: session.user.id,
              users_email: session.user.email,
              users_avatar_url: session.user.user_metadata?.avatar_url || null,
              users_role: "user",
            });

          if (insertError) {
            console.error("Failed to insert user:", insertError);
          }
        }

        // Log login/register activity
        logActivity({
          userId: session.user.id,
          action: existingUser ? "LOGIN" : "REGISTER",
          type: "USER_LOGIN",
          entityType: "USER",
          entityId: session.user.id,
          details: {
            email: session.user.email,
            provider: "google",
            platform: "web",
          },
        }).catch((logError) => {
          console.error("Failed to log Google auth activity:", logError);
        });

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      }
    } catch (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Authentication failed",
        )}`,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/signin?error=${encodeURIComponent("No authentication code provided")}`,
  );
}
