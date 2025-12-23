import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Initialize Admin Client (Service Role)
const supabaseAdmin = createSupabaseServiceClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "Registration ID is required" },
        { status: 400 },
      );
    }

    // Authenticate user via cookie
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;

    // Verify ownership and retrieve plan storage limit
    const { data: registration, error: regError } = await supabaseAdmin
      .from("mailroom_registration_table")
      .select("user_id, mailroom_plan_table ( mailroom_plan_storage_limit )")
      .eq("mailroom_registration_id", registrationId)
      .single();

    if (regError) {
      return NextResponse.json(
        { error: regError.message ?? "Registration not found" },
        { status: 404 },
      );
    }
    if (!registration || (registration.user_id as string) !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to view these files" },
        { status: 403 },
      );
    }

    // Fetch files (scans) attached to mailbox items for this registration
    const { data: scansData, error: scansError } = await supabaseAdmin
      .from("mailroom_file_table")
      .select(
        `
        mailroom_file_id,
        mailbox_item_id,
        mailroom_file_name,
        mailroom_file_url,
        mailroom_file_size_mb,
        mailroom_file_mime_type,
        mailroom_file_uploaded_at,
        mailroom_file_type,
        mailbox_item_table (
          mailbox_item_id,
          mailbox_item_name,
          mailroom_registration_id
        )
      `,
      )
      .eq("mailbox_item_table.mailroom_registration_id", registrationId)
      .order("mailroom_file_uploaded_at", { ascending: false });

    if (scansError) {
      return NextResponse.json({ error: scansError.message }, { status: 500 });
    }

    // calculate usage safely
    const scansArray = Array.isArray(scansData) ? scansData : [];
    const planObj =
      (
        registration as {
          mailroom_plan_table?: { mailroom_plan_storage_limit?: number } | null;
        }
      )?.mailroom_plan_table ?? null;
    const limitMb =
      typeof planObj === "object" && planObj != null
        ? Number(planObj.mailroom_plan_storage_limit ?? 0)
        : 0 || 100;

    const totalUsedMb = scansArray.reduce((acc: number, s: unknown) => {
      if (typeof s === "object" && s !== null) {
        const rec = s as Record<string, unknown>;
        const val = rec.mailroom_file_size_mb ?? rec.file_size_mb ?? 0;
        const num = typeof val === "number" ? val : Number(val ?? 0);
        return acc + (isFinite(num) ? num : 0);
      }
      return acc;
    }, 0);

    return NextResponse.json({
      scans: scansArray,
      usage: {
        used_mb: totalUsedMb,
        limit_mb: limitMb > 0 ? limitMb : 100,
        percentage:
          limitMb > 0 ? Math.min((totalUsedMb / limitMb) * 100, 100) : 0,
      },
    });
  } catch (err: unknown) {
    console.error("Fetch scans error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
