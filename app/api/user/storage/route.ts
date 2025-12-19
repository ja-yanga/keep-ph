import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

type Plan = {
  mailroom_plan_storage_limit: number | null;
};

type Registration = {
  mailroom_registration_id: string;
  plan: Plan | Plan[] | null;
};

type Package = {
  mailbox_item_id: string;
};

type ScanPackage = {
  mailbox_item_id: string;
  mailbox_item_name: string | null;
  mailroom_registration_id: string;
};

type Scan = {
  mailroom_file_id: string;
  mailbox_item_id: string;
  mailroom_file_name: string;
  mailroom_file_url: string;
  mailroom_file_size_mb: number;
  mailroom_file_mime_type: string | null;
  mailroom_file_uploaded_at: string;
  package: ScanPackage;
};

export async function GET() {
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
      },
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
      .from("mailroom_registration_table")
      .select(
        `mailroom_registration_id, plan:mailroom_plan_table(mailroom_plan_storage_limit)`,
      )
      .eq("user_id", userId);

    if (regsErr) throw regsErr;

    const registrationIds =
      Array.isArray(regs) && regs.length > 0
        ? regs
            .map((r: Registration) => r.mailroom_registration_id)
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            )
        : [];
    // compute total storage limit (sum of plan.storage_limit)
    let totalLimitMb = 0;
    if (Array.isArray(regs)) {
      regs.forEach((r: Registration) => {
        const plan = Array.isArray(r.plan) ? r.plan[0] : r.plan;
        totalLimitMb += Number(plan?.mailroom_plan_storage_limit ?? 0);
      });
    }

    // fetch scans for all packages that belong to these registrations
    let scans: Scan[] = [];
    if (registrationIds.length > 0) {
      // First, get all package IDs for these registrations
      const { data: packagesData, error: packagesErr } = await supabaseAdmin
        .from("mailbox_item_table")
        .select("mailbox_item_id")
        .in("mailroom_registration_id", registrationIds);

      if (packagesErr) throw packagesErr;

      const packageIds = Array.isArray(packagesData)
        ? packagesData
            .map((p: Package) => p.mailbox_item_id)
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            )
        : [];

      // Then fetch scans for those packages
      if (packageIds.length > 0) {
        const { data: scansData, error: scansErr } = await supabaseAdmin
          .from("mailroom_file_table")
          .select(
            `
            *,
            package:mailbox_item_table!inner(
              mailbox_item_id,
              mailbox_item_name,
              mailroom_registration_id
            )
          `,
          )
          .in("mailbox_item_id", packageIds)
          .order("mailroom_file_uploaded_at", { ascending: false });

        if (scansErr) throw scansErr;
        scans = (scansData as Scan[]) ?? [];
      }
    }

    const totalUsedMb = scans.reduce(
      (acc, s: Scan) => acc + Number(s.mailroom_file_size_mb ?? 0),
      0,
    );

    // Transform data to match frontend expectations
    const transformedScans = scans.map((scan) => ({
      id: scan.mailroom_file_id,
      file_name: scan.mailroom_file_name,
      file_url: scan.mailroom_file_url,
      file_size_mb: scan.mailroom_file_size_mb,
      uploaded_at: scan.mailroom_file_uploaded_at,
      mime_type: scan.mailroom_file_mime_type,
      package_id: scan.mailbox_item_id,
      package: scan.package
        ? {
            id: scan.package.mailbox_item_id,
            package_name: scan.package.mailbox_item_name,
          }
        : null,
    }));

    return NextResponse.json({
      scans: transformedScans,
      usage: {
        used_mb: totalUsedMb,
        limit_mb: totalLimitMb,
        percentage:
          totalLimitMb > 0
            ? Math.min((totalUsedMb / totalLimitMb) * 100, 100)
            : 0,
      },
    });
  } catch (err: unknown) {
    let message = "Unexpected server error";
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object" && "message" in err) {
      message = String(err.message);
    } else if (err && typeof err === "object" && "details" in err) {
      message = String(err.details);
    } else if (err) {
      message = String(err);
    }

    // Enhanced error logging for key-related issues
    const errorObj = err as Record<string, unknown> | null;
    const errorCode = errorObj?.code;
    const errorHint = errorObj?.hint;

    console.error("user storage error:", {
      message,
      code: errorCode,
      hint: errorHint,
      error: err,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    });

    // Provide more helpful error message for key-related errors
    if (
      message.includes("no suitable key") ||
      message.includes("wrong key type") ||
      errorCode === "PGRST301"
    ) {
      message =
        "Authentication key error. Please verify SUPABASE_SERVICE_ROLE_KEY matches your project configuration.";
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
