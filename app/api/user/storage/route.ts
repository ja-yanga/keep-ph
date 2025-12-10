import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();

    // authenticate user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;

    // fetch registrations for user with plan storage limits
    const { data: regs, error: regsErr } = await supabaseAdmin
      .from("mailroom_registrations")
      .select(`id, plan:mailroom_plans(storage_limit)`)
      .eq("user_id", userId);

    if (regsErr) throw regsErr;

    const registrationIds = Array.isArray(regs)
      ? regs.map((r: any) => r.id)
      : [];
    // compute total storage limit (sum of plan.storage_limit)
    let totalLimitMb = 0;
    if (Array.isArray(regs)) {
      regs.forEach((r: any) => {
        const plan = Array.isArray(r.plan) ? r.plan[0] : r.plan;
        totalLimitMb += Number(plan?.storage_limit ?? 0);
      });
    }

    // fetch scans for all packages that belong to these registrations
    let scans: any[] = [];
    if (registrationIds.length > 0) {
      const { data: scansData, error: scansErr } = await supabaseAdmin
        .from("mailroom_scans")
        .select(
          `
          *,
          package:mailroom_packages!inner(
            id,
            package_name,
            registration_id
          )
        `
        )
        .in("package.registration_id", registrationIds)
        .order("uploaded_at", { ascending: false });

      if (scansErr) throw scansErr;
      scans = scansData ?? [];
    }

    const totalUsedMb = scans.reduce(
      (acc, s: any) => acc + Number(s.file_size_mb ?? 0),
      0
    );

    return NextResponse.json({
      scans,
      usage: {
        used_mb: totalUsedMb,
        limit_mb: totalLimitMb,
        percentage:
          totalLimitMb > 0
            ? Math.min((totalUsedMb / totalLimitMb) * 100, 100)
            : 0,
      },
    });
  } catch (err: any) {
    console.error("user storage error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
