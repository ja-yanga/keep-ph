import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import { adminProcessMailroomScan } from "@/app/actions/post";

// Initialize Admin Client (Service Role needed for Storage uploads if RLS is strict)
const supabase = createSupabaseServiceClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const packageId = formData.get("packageId") as string;

    if (!file || !packageId) {
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
      .from("MAILROOM-SCANS")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Get Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("MAILROOM-SCANS").getPublicUrl(filePath);

    // 3. Call server action / RPC to handle database updates
    const fileSizeMb = file.size / (1024 * 1024);
    const result = await adminProcessMailroomScan({
      package_id: packageId,
      file_name: file.name,
      file_url: publicUrl,
      file_size_mb: fileSizeMb,
      file_mime_type: file.type,
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to process scan record");
    }

    const { user_id, mailroom_registration_id, mailbox_item_name } =
      result.data;

    // 4. Send Notification
    if (user_id) {
      try {
        const label = mailbox_item_name ?? "Unknown";
        await sendNotification(
          user_id,
          "Document Scanned",
          `Your document (${label}) has been scanned and is ready to view.`,
          "SCAN_READY",
          `/mailroom/${mailroom_registration_id}`,
        );
      } catch (notifyErr) {
        console.error("sendNotification failed:", notifyErr);
      }
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    console.error("admin.mailroom.scans.POST:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
