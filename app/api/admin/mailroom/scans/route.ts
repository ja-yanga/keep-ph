import {
  createSupabaseServiceClient,
  createClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

// Initialize Admin Client (Service Role needed for Storage uploads if RLS is strict)
const supabase = createSupabaseServiceClient();

export async function POST(request: Request) {
  try {
    // 0. Authentication Check
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const packageId = formData.get("packageId") as string;

    if (!file || !packageId) {
      void logApiError(request, {
        status: 400,
        message: "File and Package ID are required",
      });
      return NextResponse.json(
        { error: "File and Package ID are required" },
        { status: 400 },
      );
    }

    // 1. Upload File to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${packageId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("MAILROOM-SCANS") // Ensure this bucket exists in Supabase
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Get Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("MAILROOM-SCANS").getPublicUrl(filePath);

    // 3. Insert Record into mailroom_file_table
    const fileSizeMb = file.size / (1024 * 1024); // Convert bytes to MB

    const { error: dbError } = await supabase
      .from("mailroom_file_table")
      .insert({
        mailbox_item_id: packageId,
        mailroom_file_name: file.name,
        mailroom_file_url: publicUrl,
        mailroom_file_size_mb: fileSizeMb,
        mailroom_file_mime_type: file.type,
        mailroom_file_type: "SCANNED",
      });

    if (dbError) {
      void logApiError(request, {
        status: 500,
        message: dbError.message,
        error: dbError,
      });
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 4. Update Package Status (Reset to STORED or mark as PROCESSED)
    // We reset to 'STORED' so the "Request" badge disappears, but the file is now linked.
    const { data: pkgData, error: updateError } = await supabase
      .from("mailbox_item_table")
      .update({ mailbox_item_status: "STORED" })
      .eq("mailbox_item_id", packageId)
      .select("mailroom_registration_id, mailbox_item_name")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Fetch registration to get user_id and mailroom_registration_code
    const { data: registration } = await supabase
      .from("mailroom_registration_table")
      .select("user_id, mailroom_registration_code")
      .eq("mailroom_registration_id", pkgData.mailroom_registration_id)
      .single();

    // 6. Send Notification
    if (registration?.user_id) {
      try {
        const label = pkgData?.mailbox_item_name ?? "Unknown";
        await sendNotification(
          registration.user_id,
          "Document Scanned",
          `Your document (${label}) has been scanned and is ready to view.`,
          "SCAN_READY",
          `/mailroom/${pkgData.mailroom_registration_id}`,
        );
      } catch (notifyErr) {
        console.error("sendNotification failed:", notifyErr);
      }
    }

    // 7. Log Activity
    try {
      await logActivity({
        userId: user.id,
        action: "SCAN",
        type: "ADMIN_ACTION",
        entityType: "MAILBOX_ITEM",
        entityId: packageId,
        details: {
          package_status: "SCAN",
          package_name: pkgData.mailbox_item_name,
        },
      });
    } catch (logErr) {
      console.error("Scan activity log failed:", logErr);
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    console.error("Scan upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    void logApiError(request, {
      status: 500,
      message: errorMessage,
      error,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
