import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { adminListMailroomPlans } from "@/app/actions/get";

const PAYMONGO_PLANS_URL = "https://api.paymongo.com/v1/subscriptions/plans";
const MIN_AMOUNT_CENTAVOS = 2000;

/**
 * POST /api/admin/payments/seed-paymongo-plans
 *
 * Creates PayMongo plans for each mailroom plan (monthly + annual) and stores
 * their IDs in mailroom_plan_table. Run once after PayMongo enables Subscriptions.
 *
 * Requires: PAYMONGO_SECRET_KEY, Subscriptions enabled for the organization.
 */
export async function POST() {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "PAYMONGO_SECRET_KEY missing" },
      { status: 500 },
    );
  }

  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const plans = await adminListMailroomPlans();
    if (plans.length === 0) {
      return NextResponse.json(
        { error: "No mailroom plans found", seeded: 0 },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServiceClient();
    const results: Array<{
      mailroom_plan_id: string;
      name: string;
      paymongo_plan_id_monthly: string | null;
      paymongo_plan_id_annual: string | null;
      error?: string;
    }> = [];

    for (const plan of plans) {
      const planId = plan.mailroom_plan_id;
      const name = plan.mailroom_plan_name ?? "Mailroom Plan";
      const pricePhp = Number(plan.mailroom_plan_price) || 0;
      const monthlyAmount = Math.max(
        MIN_AMOUNT_CENTAVOS,
        Math.round(pricePhp * 100),
      );
      const annualAmount = Math.max(
        MIN_AMOUNT_CENTAVOS,
        Math.round(pricePhp * 12 * 0.8 * 100),
      );

      let paymongoMonthlyId: string | null = null;
      let paymongoAnnualId: string | null = null;

      try {
        const [monthlyRes, annualRes] = await Promise.all([
          fetch(PAYMONGO_PLANS_URL, {
            method: "POST",
            headers: {
              Authorization: auth,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  name: `${name} (Monthly)`,
                  amount: monthlyAmount,
                  currency: "PHP",
                  interval: "monthly",
                  interval_count: 1,
                },
              },
            }),
          }),
          fetch(PAYMONGO_PLANS_URL, {
            method: "POST",
            headers: {
              Authorization: auth,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  name: `${name} (Annual)`,
                  amount: annualAmount,
                  currency: "PHP",
                  interval: "yearly",
                  interval_count: 1,
                },
              },
            }),
          }),
        ]);

        const monthlyJson = await monthlyRes.json().catch(() => null);
        const annualJson = await annualRes.json().catch(() => null);

        if (monthlyRes.ok && monthlyJson?.data?.id) {
          paymongoMonthlyId = monthlyJson.data.id;
        }
        if (annualRes.ok && annualJson?.data?.id) {
          paymongoAnnualId = annualJson.data.id;
        }

        const errMsg =
          !paymongoMonthlyId || !paymongoAnnualId
            ? [
                !paymongoMonthlyId &&
                  `monthly: ${(monthlyJson as { errors?: unknown[] })?.errors?.[0] ?? monthlyRes.status}`,
                !paymongoAnnualId &&
                  `annual: ${(annualJson as { errors?: unknown[] })?.errors?.[0] ?? annualRes.status}`,
              ]
                .filter(Boolean)
                .join("; ")
            : undefined;

        if (paymongoMonthlyId || paymongoAnnualId) {
          const { error: updateErr } = await supabase
            .from("mailroom_plan_table")
            .update({
              paymongo_plan_id_monthly: paymongoMonthlyId,
              paymongo_plan_id_annual: paymongoAnnualId,
            })
            .eq("mailroom_plan_id", planId);

          if (updateErr) {
            results.push({
              mailroom_plan_id: planId,
              name,
              paymongo_plan_id_monthly: paymongoMonthlyId,
              paymongo_plan_id_annual: paymongoAnnualId,
              error: `DB update failed: ${updateErr.message}`,
            });
          } else {
            results.push({
              mailroom_plan_id: planId,
              name,
              paymongo_plan_id_monthly: paymongoMonthlyId,
              paymongo_plan_id_annual: paymongoAnnualId,
            });
          }
        } else {
          results.push({
            mailroom_plan_id: planId,
            name,
            paymongo_plan_id_monthly: null,
            paymongo_plan_id_annual: null,
            error: errMsg ?? "Failed to create PayMongo plans",
          });
        }
      } catch (err) {
        results.push({
          mailroom_plan_id: planId,
          name,
          paymongo_plan_id_monthly: null,
          paymongo_plan_id_annual: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const successCount = results.filter(
      (r) => r.paymongo_plan_id_monthly && r.paymongo_plan_id_annual,
    ).length;
    return NextResponse.json({
      success: successCount === plans.length,
      seeded: successCount,
      total: plans.length,
      results,
    });
  } catch (error) {
    console.error("[admin/payments/seed-paymongo-plans] error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to seed plans",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
