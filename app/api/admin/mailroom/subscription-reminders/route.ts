import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import dayjs from "dayjs";

const supabaseAdmin = createSupabaseServiceClient();

/**
 * POST /api/admin/mailroom/subscription-reminders
 * Cron job to send email reminders for upcoming subscription renewals
 * Should be run daily (e.g., via Vercel Cron or Supabase pg_cron)
 *
 * Sends reminders:
 * - 7 days before renewal
 * - 3 days before renewal
 * - 1 day before renewal
 *
 * Security: Can be protected with CRON_SECRET_TOKEN if called from Supabase pg_cron
 */
export async function POST(req: Request) {
  // Optional: Verify secret token if called from Supabase pg_cron
  // Vercel Cron automatically secures the endpoint, but Supabase pg_cron needs auth
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET_TOKEN;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Only check if CRON_SECRET_TOKEN is set (for Supabase pg_cron)
    // Vercel Cron doesn't send Authorization header, so we allow it through
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    if (!vercelCronHeader) {
      // Not from Vercel Cron and no valid token
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const now = dayjs();
    const sevenDaysFromNow = now.add(7, "days").toISOString();

    // Get subscriptions expiring in 7 days (3- and 1-day windows can be added later)
    const { data: subscriptions, error: fetchErr } = await supabaseAdmin
      .from("subscription_table")
      .select(
        `
        subscription_id,
        mailroom_registration_id,
        subscription_expires_at,
        subscription_auto_renew,
        mailroom_registration_table!inner(
          user_id,
          mailroom_plan_table(mailroom_plan_name, mailroom_plan_price)
        )
      `,
      )
      .eq("subscription_auto_renew", true)
      .gte("subscription_expires_at", now.toISOString())
      .lte("subscription_expires_at", sevenDaysFromNow);

    if (fetchErr) throw fetchErr;

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return NextResponse.json({
        message: "No subscriptions need reminders.",
        sent: 0,
      });
    }

    let sentCount = 0;
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = process.env.NEXT_PUBLIC_APP_URL || "localhost:3000";

    for (const sub of subscriptions) {
      const rec = sub as Record<string, unknown>;
      const expiresAt = rec.subscription_expires_at as string;
      const registration = rec.mailroom_registration_table as Record<
        string,
        unknown
      >;
      const userId = registration?.user_id as string;
      const plan = registration?.mailroom_plan_table as Record<
        string,
        unknown
      > | null;

      if (!userId || !expiresAt) continue;

      const expiryDate = dayjs(expiresAt);
      const daysUntilRenewal = expiryDate.diff(now, "day");

      // Only send reminders at specific intervals
      if (
        daysUntilRenewal !== 7 &&
        daysUntilRenewal !== 3 &&
        daysUntilRenewal !== 1
      ) {
        continue;
      }

      // Get user details
      const { data: user } = await supabaseAdmin
        .from("users_table")
        .select("users_email, users_first_name, users_last_name")
        .eq("users_id", userId)
        .single();

      if (!user?.users_email) continue;

      const planName = (plan?.mailroom_plan_name as string) || "Mailroom Plan";
      const planPrice = plan?.mailroom_plan_price
        ? `PHP ${Number(plan.mailroom_plan_price).toFixed(2)}`
        : "N/A";

      try {
        await fetch(`${protocol}://${host}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: user.users_email as string,
            template: "SUBSCRIPTION_RENEWAL_REMINDER",
            data: {
              recipientName:
                (user.users_first_name as string) ||
                (user.users_last_name as string) ||
                "User",
              planName,
              amount: planPrice,
              daysUntilRenewal: daysUntilRenewal.toString(),
              renewalDate: expiryDate.format("MMMM D, YYYY"),
            },
          }),
        });

        sentCount++;
        console.log(
          `[reminders] Sent renewal reminder to ${user.users_email} (${daysUntilRenewal} days until renewal)`,
        );
      } catch (emailErr) {
        console.error(
          `[reminders] Failed to send reminder to ${user.users_email}:`,
          emailErr,
        );
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: subscriptions.length,
      message: `Sent ${sentCount} renewal reminders`,
    });
  } catch (err: unknown) {
    console.error("[reminders] error:", err);
    return NextResponse.json(
      { error: "Reminder processing failed", details: String(err) },
      { status: 500 },
    );
  }
}
